import { useNavigate } from 'react-router-dom';

export const useTransitionNavigate = () => {
    const navigate = useNavigate();

    return (to, options) => {
        if (!document.startViewTransition) {
            navigate(to, options);
            return;
        }

        document.startViewTransition(() => {
            navigate(to, options);
        });
    };
};