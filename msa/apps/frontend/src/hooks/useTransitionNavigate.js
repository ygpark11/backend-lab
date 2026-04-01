import { useNavigate } from 'react-router-dom';

export const useTransitionNavigate = () => {
    const navigate = useNavigate();

    return (to, options) => {
        if (!document.startViewTransition) {
            navigate(to, options);
            return;
        }

        const transition = document.startViewTransition(() => {
            navigate(to, options);
        });

        transition.ready.catch(() => {});
        transition.finished.catch((e) => {
            if (e.name !== 'AbortError') {
                console.error('View transition error:', e);
            }
        });
    };
};