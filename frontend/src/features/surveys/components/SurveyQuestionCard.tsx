import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ComboboxField } from '@/components/ComboboxField';
import { IconTooltip } from '@/components/IconTooltip';
import {
    QUESTION_KIND_OPTIONS,
    scaleChoices,
    type DraftQuestion,
    type QuestionKind,
} from '@/features/surveys/lib/surveyDraft';

interface SurveyQuestionCardProps {
    question: DraftQuestion;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    canRemove: boolean;
    disabled?: boolean;
    onUpdate: (patch: Partial<DraftQuestion>) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onAddChoice: () => void;
    onUpdateChoice: (
        choiceKey: string,
        label: string,
        description: string,
    ) => void;
    onRemoveChoice: (choiceKey: string) => void;
}

export const SurveyQuestionCard = ({
    question,
    index,
    isFirst,
    isLast,
    canRemove,
    disabled = false,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
    onAddChoice,
    onUpdateChoice,
    onRemoveChoice,
}: SurveyQuestionCardProps) => (
    <div className="rounded-xl border bg-card p-4 grid gap-3">
        <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
                Pregunta {index + 1}
            </span>
            <div className="flex gap-1">
                <IconTooltip label="Subir pregunta">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Subir pregunta"
                        disabled={isFirst || disabled}
                        onClick={onMoveUp}
                    >
                        <ChevronUp className="size-4" />
                    </Button>
                </IconTooltip>
                <IconTooltip label="Bajar pregunta">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Bajar pregunta"
                        disabled={isLast || disabled}
                        onClick={onMoveDown}
                    >
                        <ChevronDown className="size-4" />
                    </Button>
                </IconTooltip>
                <IconTooltip label="Eliminar pregunta">
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        aria-label="Eliminar pregunta"
                        disabled={!canRemove || disabled}
                        onClick={onRemove}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </IconTooltip>
            </div>
        </div>

        <div className="grid gap-1.5">
            <Label>Enunciado *</Label>
            <Textarea
                required
                maxLength={300}
                value={question.prompt}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                disabled={disabled}
            />
        </div>

        <div className="grid gap-1.5">
            <Label>Texto de ayuda (opcional)</Label>
            <Input
                maxLength={300}
                value={question.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                disabled={disabled}
            />
        </div>

        <Label>Tipo</Label>
        <div className="flex flex-wrap items-center gap-3">
            <div className="grid gap-1.5">
                <ComboboxField
                    className="w-48"
                    items={QUESTION_KIND_OPTIONS}
                    getValue={(o) => o.id}
                    getLabel={(o) => o.name}
                    value={question.kind}
                    onValueChange={(value) =>
                        onUpdate({ kind: value as QuestionKind })
                    }
                    searchable={false}
                    disabled={disabled}
                />
            </div>

            {question.kind !== 'text' && (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                        onUpdate({ kind: 'single', choices: scaleChoices() })
                    }
                >
                    Escala 1-5
                </Button>
            )}

            <label className="flex items-center gap-2 text-sm">
                <Checkbox
                    checked={question.required}
                    onCheckedChange={(checked) =>
                        onUpdate({ required: checked === true })
                    }
                    disabled={disabled}
                />
                Obligatoria
            </label>
        </div>

        {question.kind !== 'text' && (
            <div className="grid gap-2">
                <Label>Opciones *</Label>
                {question.choices.map((choice) => (
                    <div
                        key={choice.key}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <Input
                            placeholder="Etiqueta"
                            className="w-full sm:w-48"
                            value={choice.label}
                            onChange={(e) =>
                                onUpdateChoice(
                                    choice.key,
                                    e.target.value,
                                    choice.description,
                                )
                            }
                            disabled={disabled}
                        />
                        <Input
                            placeholder="Descripción (opcional)"
                            className="w-full sm:w-64"
                            value={choice.description}
                            onChange={(e) =>
                                onUpdateChoice(
                                    choice.key,
                                    choice.label,
                                    e.target.value,
                                )
                            }
                            disabled={disabled}
                        />
                        <IconTooltip label="Eliminar opción">
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar opción"
                                disabled={
                                    question.choices.length <= 2 || disabled
                                }
                                onClick={() => onRemoveChoice(choice.key)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </IconTooltip>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                    disabled={disabled}
                    onClick={onAddChoice}
                >
                    <Plus className="size-4" />
                    Añadir opción
                </Button>
            </div>
        )}
    </div>
);
