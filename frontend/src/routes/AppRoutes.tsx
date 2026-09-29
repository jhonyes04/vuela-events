import { Route, Routes } from 'react-router';
import { RequirePermission } from '@/features/auth/components/RequirePermission';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { appRoutes } from './routes';

export function AppRoutes() {
    return (
        <Routes>
            {appRoutes.map((route) => (
                <Route
                    key={route.path}
                    path={route.path}
                    element={
                        route.permissions ? (
                            <RequirePermission permissions={route.permissions}>
                                {route.element}
                            </RequirePermission>
                        ) : (
                            route.element
                        )
                    }
                />
            ))}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
