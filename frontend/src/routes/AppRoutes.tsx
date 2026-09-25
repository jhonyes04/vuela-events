import { Route, Routes } from 'react-router';
import { RequireRole } from '@/auth/RequireRole';
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
                        route.roles ? (
                            <RequireRole roles={route.roles}>
                                {route.element}
                            </RequireRole>
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
