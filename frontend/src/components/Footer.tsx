import { Star } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import logoJunta from '@/assets/logos-footer/junta.svg';
// import logoVuela from '@/assets/logos-footer/vuela.svg';
// import dipAlmeria from '@/assets/logos-footer/dip-almeria.svg';
// import dipCadiz from '@/assets/logos-footer/dip-cadiz.svg';
// import dipCordoba from '@/assets/logos-footer/dip-cordoba.svg';
// import dipGranada from '@/assets/logos-footer/dip-granada.svg';
// import dipHuelva from '@/assets/logos-footer/dip-huelva.svg';
// import dipJaen from '@/assets/logos-footer/dip-jaen.svg';
// import dipMalaga from '@/assets/logos-footer/dip-malaga.svg';
// import dipSevilla from '@/assets/logos-footer/dip-sevilla.svg';

export interface FooterProps {
    // Solo se pasa en modo mantenimiento: convierte la estrella decorativa
    // en el disparador del login de superadmin.
    onAdminStarClick?: () => void;
}

// interface FooterImage {
//     key: string;
//     image: string;
//     label: string;
//     url: string;
//     className?: string;
// }

// const Images: FooterImage[] = [
//     {
//         key: 'junta',
//         image: logoJunta,
//         label: 'Junta de Andalucía',
//         url: 'https://www.juntadeandalucia.es',
//         className: 'h-12',
//     },
//     {
//         key: 'vuela',
//         image: logoVuela,
//         label: 'Puntos Vuela',
//         url: 'https://www.puntosvuela.es',
//         className: 'h-7',
//     },
//     {
//         key: 'almeria',
//         image: dipAlmeria,
//         label: 'Diputación de Almería',
//         url: 'https://www.dipalme.org',
//     },
//     {
//         key: 'cadiz',
//         image: dipCadiz,
//         label: 'Diputación de Cádiz',
//         url: 'https://www.dipucadiz.es/',
//         className: 'h-4',
//     },
//     {
//         key: 'cordoba',
//         image: dipCordoba,
//         label: 'Diputación de Córdoba',
//         url: 'https://www.dipucordoba.es/',
//     },
//     {
//         key: 'granada',
//         image: dipGranada,
//         label: 'Diputación de Granada',
//         url: 'https://www.dipgra.es/',
//     },
//     {
//         key: 'huelva',
//         image: dipHuelva,
//         label: 'Diputación de Huelva',
//         url: 'https://www.diphuelva.es/',
//     },
//     {
//         key: 'jaen',
//         image: dipJaen,
//         label: 'Diputación de Jaén',
//         url: 'https://www.dipujaen.es/',
//     },
//     {
//         key: 'malaga',
//         image: dipMalaga,
//         label: 'Diputación de Málaga',
//         url: 'https://www.malaga.es/',
//     },
//     {
//         key: 'sevilla',
//         image: dipSevilla,
//         label: 'Diputación de Sevilla',
//         url: 'https://www.dipusevilla.es/',
//     },
// ];

export const Footer = ({ onAdminStarClick }: FooterProps = {}) => (
    <footer className="border-t border-black/10 bg-brand-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 px-4 py-4 text-center text-sm sm:flex-row sm:text-left">
            <p className="text-white/80">
                &copy; {new Date().getFullYear()} Vuela Events
            </p>
            {/* <div className="flex items-center gap-5">
                {Images.map((image) => (
                    <a key={image.key} href={image.url} target="_blank">
                        <img
                            src={image.image}
                            alt={image.label}
                            className={cn(
                                'h-9 w-auto object-contain brightness-0 invert',
                                image.className,
                            )}
                        />
                    </a>
                ))}
            </div> */}
            <div className="flex items-center gap-1.5">
                {/* <div className="flex flex-col items-end gap-0.5 text-white/40"> */}
                {/* <span className="flex items-center gap-1.5">Juanma</span> */}
                <span className="text-white/40">Punto Vuela Almáchar</span>
                {/* </div> */}
                {onAdminStarClick ? (
                    <button
                        type="button"
                        onClick={onAdminStarClick}
                        aria-label="Iniciar sesión como superadmin"
                        className="shrink-0 transition-opacity hover:opacity-80"
                    >
                        <Star
                            className="size-4 text-yellow-300"
                            fill="currentColor"
                        />
                    </button>
                ) : (
                    <Star
                        className="size-4 shrink-0 text-yellow-300"
                        fill="currentColor"
                    />
                )}
            </div>
        </div>
    </footer>
);
