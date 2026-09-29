interface PlaceholderPageProps {
    title: string;
}

export const PlaceholderPage = ({ title }: PlaceholderPageProps) => (
    <section>
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">Próximamente</p>
    </section>
);
