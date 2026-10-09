import { PageTitle } from '@/components/PageTitle';
import { MyEventsSection } from '@/features/profile/components/MyEventsSection';

export const MyEventsPage = () => (
    <section className="mx-auto grid w-full max-w-5xl gap-6">
        <div className="grid gap-1">
            <PageTitle>Mis eventos</PageTitle>
            <p className="text-sm text-muted-foreground">
                Eventos en los que estás inscrito.
            </p>
        </div>

        <MyEventsSection />
    </section>
);
