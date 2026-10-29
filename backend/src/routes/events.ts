import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
    requireAuth,
    requireCompleteProfile,
    requirePermission,
} from '../middleware/auth.js';
import {
    isRealDate,
    madridDayKey,
    MAX_OCCURRENCES,
    RecurrenceError,
} from '../lib/recurrence.js';
import {
    deleteEvent,
    deleteEventSeries,
    EventDeleteError,
} from '../services/eventDeletion.js';
import { createEventSeries } from '../services/eventSeries.js';
import { notifyEventCreated } from '../services/eventNotify.js';
import {
    listAttendees,
    listRegistrationCandidates,
    registerForEvent,
    RegistrationError,
    unregisterFromEvent,
    unregisterRegistration,
} from '../services/registration.js';
import {
    generateAttendanceReport,
    AttendanceReportError,
} from '../services/attendanceReport.js';
import { createReportDraft } from '../services/reportDrafts.js';
import { recordAudit } from '../services/audit.js';
import { getEventAttachmentFile } from '../services/eventAttachments.js';
import {
    matchesDocumentType,
    documentContentTypeSchema,
} from '../lib/documentValidation.js';
import { canManageResource } from '../lib/ownership.js';

// Sin caracteres de control ni < > : evita que title/location (insertados sin
// escapar en el HTML de los correos vía {{proyecto}}/{{lugar}}) cuelen markup.
const NO_CONTROL_OR_TAGS = /^[^\p{C}<>]+$/u;

const hasFullAttendeeAccess = (actor: { permissions: string[] }): boolean =>
    ['attendees:view', 'attendees:add', 'attendees:delete'].every((code) =>
        actor.permissions.includes(code),
    );

// Campos comunes a un evento suelto y a una serie.
const eventFields = {
    title: z.string().trim().min(1).max(120).regex(NO_CONTROL_OR_TAGS),
    subtitle: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(NO_CONTROL_OR_TAGS)
        .optional(),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().min(1).max(200).regex(NO_CONTROL_OR_TAGS),
    modality: z.enum(['presencial', 'online']).default('presencial'),
    capacity: z.number().int().positive().max(100_000).optional(),
    projectId: z.uuid(),
    guideId: z.uuid(),
    materialIds: z.array(z.uuid()).default([]),
    attachments: z
        .array(
            z.strictObject({
                fileName: z.string().trim().min(1).max(255),
                contentType: documentContentTypeSchema,
                dataBase64: z.string().min(1),
            }),
        )
        .max(5)
        .default([]),
};

// El proyecto debe existir y estar activo: uno inactivo no admite eventos nuevos.
const isActiveProject = async (projectId: string): Promise<boolean> => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { active: true },
    });

    return project?.active === true;
};

const materialsExist = async (materialIds: string[]): Promise<boolean> => {
    if (materialIds.length === 0) return true;

    const count = await prisma.material.count({
        where: { id: { in: materialIds } },
    });

    return count === materialIds.length;
};

type GuideResolution = { ok: true; guideId: string } | { ok: false };

// El proyecto siempre tiene 1+ guías. Con 1 sola se fuerza esa (venga o no
// en el body); con varias, la del body debe estar entre las del proyecto.
const resolveGuideId = async (
    projectId: string,
    guideId: string,
): Promise<GuideResolution> => {
    const projectGuides = await prisma.projectGuide.findMany({
        where: { projectId },
        select: { guideId: true },
    });

    if (projectGuides.length === 1) {
        return { ok: true, guideId: projectGuides[0]!.guideId };
    }

    if (!projectGuides.some((pg) => pg.guideId === guideId)) {
        return { ok: false };
    }

    return { ok: true, guideId };
};

const MAX_EVENT_ATTACHMENT_BYTES = 1 * 1024 * 1024;

type AttachmentInput = {
    fileName: string;
    contentType: string;
    dataBase64: string;
};

// Decodifica y valida cada adjunto (tamaño + firma de bytes); null si alguno falla.
const decodeAttachments = (
    attachments: AttachmentInput[],
): { fileName: string; contentType: string; data: Buffer }[] | null => {
    const decoded: { fileName: string; contentType: string; data: Buffer }[] =
        [];

    for (const attachment of attachments) {
        let data: Buffer;

        try {
            data = Buffer.from(attachment.dataBase64, 'base64');
        } catch {
            return null;
        }

        if (
            data.length === 0 ||
            data.length > MAX_EVENT_ATTACHMENT_BYTES ||
            !matchesDocumentType(data, attachment.contentType)
        ) {
            return null;
        }

        decoded.push({
            fileName: attachment.fileName,
            contentType: attachment.contentType,
            data,
        });
    }

    return decoded;
};

const createEventSchema = z
    .strictObject({
        ...eventFields,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
    })
    .refine((e) => new Date(e.endsAt) > new Date(e.startsAt), {
        path: ['endsAt'],
        message: 'La fecha de fin debe ser posterior a la de inicio',
    });

const updateEventSchema = z
    .strictObject({
        ...eventFields,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
        // Adjuntos ya subidos que se quitan en esta edición.
        removedAttachmentIds: z.array(z.uuid()).default([]),
    })
    .refine((e) => new Date(e.endsAt) > new Date(e.startsAt), {
        path: ['endsAt'],
        message: 'La fecha de fin debe ser posterior a la de inicio',
    });

const participantsCountSchema = z.strictObject({
    participantsCount: z.number().int().min(0).max(100_000).nullable(),
    participantsObservations: z.string().trim().max(500).nullable(),
});

const dateOnly = z.string().refine(isRealDate, 'Fecha no válida');
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const createSeriesSchema = z.strictObject({
    ...eventFields,
    from: dateOnly,
    to: dateOnly,
    // Días ISO: 1 = lunes ... 7 = domingo. Sin repetidos.
    weekdays: z
        .array(z.number().int().min(1).max(7))
        .min(1)
        .max(7)
        .refine((days) => new Set(days).size === days.length),
    startTime: timeOfDay,
    endTime: timeOfDay,
});

const seriesErrors = {
    invalid_range: 'El rango de fechas u horas no es válido',
    range_too_long: 'El rango de fechas es demasiado largo',
    too_many: `Una serie no puede superar las ${MAX_OCCURRENCES} sesiones`,
    empty: 'Ninguna fecha del rango coincide con los días elegidos',
} as const;

const listQuerySchema = z.object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    registered: z.literal('1').optional(),
});

const eventSelect = {
    id: true,
    title: true,
    subtitle: true,
    description: true,
    location: true,
    modality: true,
    startsAt: true,
    endsAt: true,
    capacity: true,
    participantsCount: true,
    participantsObservations: true,
    seriesId: true,
    createdAt: true,
    createdBy: { select: { id: true, name: true, puntoVuela: true } },
    guide: { select: { id: true, name: true, url: true } },
    project: {
        select: {
            id: true,
            name: true,
            openingInstructions: true,
            closingInstructions: true,
            color: true,
            isMeeting: true,
            guides: {
                select: {
                    guide: { select: { id: true, name: true, url: true } },
                },
            },
            resourceLinks: {
                select: {
                    resourceLink: {
                        select: { id: true, title: true, url: true },
                    },
                },
            },
            documents: {
                select: {
                    document: { select: { id: true, title: true } },
                },
            },
        },
    },
    materials: {
        select: {
            material: {
                select: { id: true, name: true, observations: true },
            },
        },
    },
    attachments: {
        select: { id: true, fileName: true },
    },
    _count: {
        select: {
            registrations: { where: { user: { roleId: { not: 'dt' } } } },
        },
    },
} as const;

const flattenEventProject = <
    T extends {
        project: {
            guides: { guide: { id: string; name: string; url: string } }[];
            resourceLinks: {
                resourceLink: { id: string; title: string; url: string };
            }[];
            documents: { document: { id: string; title: string } }[];
        };
        materials: {
            material: {
                id: string;
                name: string;
                observations: string | null;
            };
        }[];
    },
>(
    event: T,
) => ({
    ...event,
    project: {
        ...event.project,
        guides: event.project.guides.map((guide) => guide.guide),
        resourceLinks: event.project.resourceLinks.map(
            (resource) => resource.resourceLink,
        ),
        documents: event.project.documents.map((document) => document.document),
    },
    materials: event.materials.map((material) => material.material),
});

const eventUserParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });
const eventRegistrationParamsSchema = z.object({
    id: z.uuid(),
    registrationId: z.uuid(),
});

const idParamsSchema = z.object({ id: z.uuid() });
const seriesParamsSchema = z.object({ seriesId: z.uuid() });

// Motivo opcional
const deleteReasonSchema = z.strictObject({
    motivo: z
        .string()
        .trim()
        .min(1)
        .max(300)
        .regex(NO_CONTROL_OR_TAGS)
        .optional(),
});

const registrationErrors = {
    not_found: [404, 'Evento o inscripción no encontrados'],
    already_registered: [409, 'Ya estás inscrito en este evento'],
    event_full: [409, 'El evento está completo'],
    event_ended: [409, 'El evento ya ha finalizado'],
    admin_not_allowed: [
        403,
        'Los administradores no pueden inscribirse en eventos',
    ],
} as const;

const attendanceReportErrors = {
    event_not_found: [404, 'Evento no encontrado'],
    no_recipients: [400, 'Selecciona al menos un destinatario'],
    event_not_ended: [409, 'El evento todavía no ha finalizado'],
    signer_title_missing: [
        409,
        'Elige en tu perfil si eres Dinamizador o Dinamizadora',
    ],
} as const;

const attendanceReportSchema = z.strictObject({
    recipientRegistrationIds: z.array(z.uuid()).min(1),
});

export const eventsRouter = Router();

// Ver eventos: cualquier usuario autenticado.
eventsRouter.use(requireAuth);

eventsRouter.get('/', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const query = listQuerySchema.safeParse(req.query);

    if (!query.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const { from, to, registered } = query.data;

    // Un AIL solo ve eventos de proyectos que marcó como interés, más los
    // que ya tiene (o tuvo) marcados por estar inscrito en ellos: así nunca
    // desaparece de su calendario algo a lo que ya se apuntó.
    const visibleToAil =
        actor.roleId === 'ail'
            ? {
                  OR: [
                      {
                          project: {
                              userPreferences: {
                                  some: { userId: actor.id },
                              },
                          },
                      },
                      { registrations: { some: { userId: actor.id } } },
                  ],
              }
            : {};

    const rows = await prisma.event.findMany({
        where: {
            ...(from && { endsAt: { gte: new Date(from) } }),
            ...(to && { startsAt: { lte: new Date(to) } }),
            ...(registered && {
                registrations: { some: { userId: actor.id } },
            }),
            ...visibleToAil,
        },
        select: {
            ...eventSelect,
            registrations: {
                where: { userId: actor.id },
                select: { id: true },
            },
        },
        orderBy: { startsAt: 'asc' },
        take: 500,
    });

    const events = rows.map(({ registrations, ...event }) =>
        flattenEventProject({
            ...event,
            registered: registrations.length > 0,
        }),
    );

    res.json({ events });
});

// Crear eventos: solo admin y dt.
eventsRouter.post(
    '/',
    requirePermission('events:create'),
    requireCompleteProfile,
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createEventSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const {
            title,
            subtitle,
            description,
            location,
            modality,
            startsAt,
            endsAt,
            capacity,
            projectId,
            guideId,
            materialIds,
            attachments,
        } = body.data;

        if (
            !actor.permissions.includes('events:backdate') &&
            madridDayKey(new Date(startsAt)) < madridDayKey(new Date())
        ) {
            res.status(400).json({
                error: 'No se pueden crear eventos en días pasados',
            });
            return;
        }

        if (!(await isActiveProject(projectId))) {
            res.status(400).json({ error: 'Proyecto no válido' });
            return;
        }

        const guideResolution = await resolveGuideId(projectId, guideId);

        if (!guideResolution.ok) {
            res.status(400).json({
                error: 'Guía no válida para este proyecto',
            });
            return;
        }

        if (!(await materialsExist(materialIds))) {
            res.status(400).json({ error: 'Material no válido' });
            return;
        }

        const decodedAttachments = decodeAttachments(attachments);

        if (decodedAttachments === null) {
            res.status(400).json({
                error: 'Algún adjunto no es válido: debe ser PDF, Word, Excel u OpenDocument de menos de 1MB',
            });
            return;
        }

        const event = await prisma.event.create({
            data: {
                title,
                subtitle,
                description,
                location,
                modality,
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
                capacity,
                projectId,
                guideId: guideResolution.guideId,
                createdById: actor.id,
                materials: {
                    create: materialIds.map((materialId) => ({ materialId })),
                },
                attachments: {
                    create: decodedAttachments.map((attachment) => ({
                        fileName: attachment.fileName,
                        contentType: attachment.contentType,
                        size: attachment.data.length,
                        data: new Uint8Array(attachment.data),
                    })),
                },
            },
            select: eventSelect,
        });

        await recordAudit({
            action: 'event_created',
            actorId: actor.id,
            newValue: event.title.slice(0, 100),
        });

        void notifyEventCreated(
            {
                title: event.title,
                location: event.location,
                projectId: event.project.id,
                sessions: [{ startsAt: event.startsAt, endsAt: event.endsAt }],
            },
            actor.id,
        );

        res.status(201).json({ event: flattenEventProject(event) });
    },
);

// Editar un evento suelto: solo quien tiene permiso de gestión.
eventsRouter.patch(
    '/:id',
    requirePermission('events:edit', 'events:edit:own'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = updateEventSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const {
            title,
            subtitle,
            description,
            location,
            modality,
            startsAt,
            endsAt,
            capacity,
            projectId,
            guideId,
            materialIds,
            attachments,
            removedAttachmentIds,
        } = body.data;

        if (!(await isActiveProject(projectId))) {
            res.status(400).json({ error: 'Proyecto no válido' });
            return;
        }

        const guideResolution = await resolveGuideId(projectId, guideId);

        if (!guideResolution.ok) {
            res.status(400).json({
                error: 'Guía no válida para este proyecto',
            });
            return;
        }

        if (!(await materialsExist(materialIds))) {
            res.status(400).json({ error: 'Material no válido' });
            return;
        }

        const exists = await prisma.event.findUnique({
            where: { id: params.data.id },
            select: {
                id: true,
                startsAt: true,
                createdById: true,
                attachments: { select: { id: true } },
            },
        });

        if (!exists) {
            res.status(404).json({ error: 'Evento no encontrado' });
            return;
        }

        if (
            !canManageResource(
                actor,
                exists.createdById,
                'events:edit',
                'events:edit:own',
            )
        ) {
            res.status(403).json({
                error: 'No tienes permiso para editar este evento',
            });
            return;
        }

        const keptAttachmentIds = exists.attachments
            .map((a) => a.id)
            .filter((id) => !removedAttachmentIds.includes(id));

        const decodedAttachments = decodeAttachments(attachments);

        if (decodedAttachments === null) {
            res.status(400).json({
                error: 'Algún adjunto no es válido: debe ser PDF, Word, Excel u OpenDocument de menos de 1MB',
            });
            return;
        }

        if (keptAttachmentIds.length + decodedAttachments.length > 5) {
            res.status(400).json({
                error: 'Un evento no puede tener más de 5 documentos adjuntos',
            });
            return;
        }

        const todayDay = madridDayKey(new Date());
        const newDay = madridDayKey(new Date(startsAt));
        const currentDay = madridDayKey(exists.startsAt);

        if (
            !actor.permissions.includes('events:backdate') &&
            newDay < todayDay &&
            newDay !== currentDay
        ) {
            res.status(400).json({
                error: 'No se pueden crear eventos en días pasados',
            });
            return;
        }

        const [, , , , event] = await prisma.$transaction([
            prisma.eventMaterial.deleteMany({
                where: { eventId: params.data.id },
            }),
            prisma.eventMaterial.createMany({
                data: materialIds.map((materialId) => ({
                    eventId: params.data.id,
                    materialId,
                })),
            }),
            prisma.eventAttachment.deleteMany({
                where: {
                    eventId: params.data.id,
                    id: { in: removedAttachmentIds },
                },
            }),
            prisma.eventAttachment.createMany({
                data: decodedAttachments.map((attachment) => ({
                    eventId: params.data.id,
                    fileName: attachment.fileName,
                    contentType: attachment.contentType,
                    size: attachment.data.length,
                    data: new Uint8Array(attachment.data),
                })),
            }),
            prisma.event.update({
                where: { id: params.data.id },
                data: {
                    title,
                    subtitle,
                    description,
                    location,
                    modality,
                    startsAt: new Date(startsAt),
                    endsAt: new Date(endsAt),
                    capacity,
                    projectId,
                    guideId: guideResolution.guideId,
                },
                select: eventSelect,
            }),
        ]);

        await recordAudit({
            action: 'event_updated',
            actorId: actor.id,
            newValue: event.title.slice(0, 100),
        });

        res.json({ event: flattenEventProject(event) });
    },
);

// Participantes externos atendidos: se rellena aparte, una vez terminado el
// evento (no forma parte del formulario de crear/editar). Tras el fin lo puede
// hacer cualquier persona autenticada; antes, solo quien puede editar eventos.
eventsRouter.patch('/:id/participants-count', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = idParamsSchema.safeParse(req.params);
    const body = participantsCountSchema.safeParse(req.body);

    if (!params.success || !body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const existing = await prisma.event.findUnique({
        where: { id: params.data.id },
        select: { id: true, endsAt: true },
    });

    if (!existing) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
    }

    const canEdit = actor.permissions.includes('events:edit');

    if (!canEdit && existing.endsAt > new Date()) {
        res.status(409).json({
            error: 'El evento todavía no ha finalizado',
        });
        return;
    }

    const event = await prisma.event.update({
        where: { id: params.data.id },
        data: {
            participantsCount: body.data.participantsCount,
            participantsObservations: body.data.participantsObservations,
        },
        select: eventSelect,
    });

    await recordAudit({
        action: 'event_participants_updated',
        actorId: actor.id,
        newValue:
            body.data.participantsCount === null
                ? 'sin especificar'
                : String(body.data.participantsCount),
    });

    res.json({ event: flattenEventProject(event) });
});

// Crear una serie recurrente (mismos días de la semana entre dos fechas): admin y dt.
// El servidor calcula las fechas; nunca se confía en una lista enviada por el cliente.
eventsRouter.post(
    '/recurring',
    requirePermission('events:create'),
    requireCompleteProfile,
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createSeriesSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        // Los adjuntos solo se admiten al crear un evento suelto, no una serie.
        const {
            from,
            to,
            weekdays,
            startTime,
            endTime,
            attachments: _attachments,
            ...fields
        } = body.data;

        if (
            !actor.permissions.includes('events:backdate') &&
            from < madridDayKey(new Date())
        ) {
            res.status(400).json({
                error: 'No se pueden crear eventos en días pasados',
            });
            return;
        }

        if (!(await isActiveProject(fields.projectId))) {
            res.status(400).json({ error: 'Proyecto no válido' });
            return;
        }

        const guideResolution = await resolveGuideId(
            fields.projectId,
            fields.guideId,
        );

        if (!guideResolution.ok) {
            res.status(400).json({
                error: 'Guía no válida para este proyecto',
            });
            return;
        }

        if (!(await materialsExist(fields.materialIds))) {
            res.status(400).json({ error: 'Material no válido' });
            return;
        }

        try {
            const series = await createEventSeries(actor.id, {
                ...fields,
                guideId: guideResolution.guideId,
                rule: { from, to, weekdays, startTime, endTime },
            });

            res.status(201).json(series);
        } catch (e) {
            if (e instanceof RecurrenceError) {
                res.status(400).json({ error: seriesErrors[e.reason] });
                return;
            }

            throw e;
        }
    },
);

// Eliminar UNA sesión: admin o quien la creó.
eventsRouter.delete(
    '/:id',
    requirePermission('events:delete', 'events:delete:own'),
    async (req, res) => {
        const actor = req.user;
        const params = idParamsSchema.safeParse(req.params);
        const body = deleteReasonSchema.safeParse(req.body ?? {});

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteEvent(actor, params.data.id, body.data.motivo);

            res.status(204).end();
        } catch (e) {
            if (e instanceof EventDeleteError) {
                res.status(e.reason === 'not_found' ? 404 : 403).json({
                    error:
                        e.reason === 'not_found'
                            ? 'Evento no encontrado'
                            : 'Solo un administrador o quien creó el evento puede eliminarlo',
                });
                return;
            }

            throw e;
        }
    },
);

// Eliminar las sesiones FUTURAS de una serie: admin o quien la creó.
eventsRouter.delete(
    '/series/:seriesId',
    requirePermission('events:delete', 'events:delete:own'),
    async (req, res) => {
        const actor = req.user;
        const params = seriesParamsSchema.safeParse(req.params);
        const body = deleteReasonSchema.safeParse(req.body ?? {});

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const result = await deleteEventSeries(
                actor,
                params.data.seriesId,
                body.data.motivo,
            );

            res.status(200).json(result);
        } catch (e) {
            if (e instanceof EventDeleteError) {
                res.status(e.reason === 'not_found' ? 404 : 403).json({
                    error:
                        e.reason === 'not_found'
                            ? 'No hay sesiones futuras que eliminar en esta serie'
                            : 'Solo un administrador o quien creó la serie puede eliminarla',
                });
                return;
            }

            throw e;
        }
    },
);

// Personas inscritas en un evento (Punto Vuela y nombre; sin los DT).
eventsRouter.get('/:id/registrations', async (req, res) => {
    const params = idParamsSchema.safeParse(req.params);

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        res.json({ registrations: await listAttendees(params.data.id) });
    } catch (e) {
        if (e instanceof RegistrationError) {
            const [status, error] = registrationErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

// Inscribirse: cualquier usuario autenticado, una vez por evento.
eventsRouter.post(
    '/:id/registrations',
    requireCompleteProfile,
    async (req, res) => {
        const actor = req.user;
        const params = idParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const registration = await registerForEvent(
                actor.id,
                params.data.id,
            );

            res.status(201).json({ registration });
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

// Cancelar la propia inscripción
eventsRouter.delete('/:id/registrations', async (req, res) => {
    const actor = req.user;
    const params = idParamsSchema.safeParse(req.params);

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        await unregisterFromEvent(actor.id, params.data.id);

        res.status(204).end();
    } catch (e) {
        if (e instanceof RegistrationError) {
            const [status, error] = registrationErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

// Candidatos para añadir manualmente (sólo quien gestiona asistencia)
eventsRouter.get(
    '/:id/registration-candidates',
    requirePermission('attendees:view'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            res.json({
                candidates: await listRegistrationCandidates(params.data.id),
            });
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

// Inscribir a otra persona
eventsRouter.post(
    '/:id/attendees/:userId',
    requirePermission('attendees:add'),
    async (req, res) => {
        const actor = req.user;
        const params = eventUserParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const registration = await registerForEvent(
                params.data.userId,
                params.data.id,
                {
                    actorId: actor.id,
                    bypassCapacity: true,
                    allowAfterEnd: hasFullAttendeeAccess(actor),
                },
            );

            res.status(201).json({ registration });
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

// Quitar a alguien (por id de inscripción, no de usuario)
eventsRouter.delete(
    '/:id/attendees/:registrationId',
    requirePermission('attendees:delete'),
    async (req, res) => {
        const actor = req.user;
        const params = eventRegistrationParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await unregisterRegistration(
                actor.id,
                params.data.id,
                params.data.registrationId,
                { allowAfterEnd: hasFullAttendeeAccess(actor) },
            );

            res.status(204).end();
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

const eventAttachmentParamsSchema = z.object({
    id: z.uuid(),
    attachmentId: z.uuid(),
});

// Descargar un adjunto del evento: cualquier persona autenticada (mismo
// criterio que el resto de la ficha del evento).
eventsRouter.get(
    '/:id/attachments/:attachmentId/download',
    async (req, res) => {
        const params = eventAttachmentParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const attachment = await getEventAttachmentFile(
            params.data.id,
            params.data.attachmentId,
        );

        if (!attachment) {
            res.status(404).json({ error: 'Adjunto no encontrado' });
            return;
        }

        res.setHeader('Content-Type', attachment.contentType);
        res.setHeader(
            'Content-Disposition',
            "attachment; filename*=UTF-8''" +
                encodeURIComponent(attachment.fileName),
        );
        res.send(Buffer.from(attachment.data));
    },
);

// Genera el acta de asistencia en PDF de los seleccionados (borrador para revisar y enviar).
eventsRouter.post(
    '/:id/attendance-report',
    requirePermission('email:send'),
    requirePermission('events:send:parte_firmas'),

    async (req, res) => {
        const actor = req.user;
        const params = idParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const body = attendanceReportSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const { pdf, filename } = await generateAttendanceReport({
                eventId: params.data.id,
                recipientRegistrationIds: body.data.recipientRegistrationIds,
                signerUserId: actor.id,
            });

            // Se guarda como borrador: el envío adjuntará exactamente este PDF.
            const draft = createReportDraft({
                eventId: params.data.id,
                senderId: actor.id,
                registrationIds: [
                    ...new Set(body.data.recipientRegistrationIds),
                ],
                filename,
                pdf,
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('X-Report-Draft-Id', draft.id);
            res.setHeader(
                'Content-Disposition',
                "inline; filename*=UTF-8''" + encodeURIComponent(filename),
            );
            res.send(pdf);
        } catch (e) {
            if (e instanceof AttendanceReportError) {
                const [status, error] = attendanceReportErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
