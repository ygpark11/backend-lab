import { create } from 'zustand';

export const useCompareStore = create((set, get) => ({
    compareList: [],

    addToCompare: (game) => {
        const { compareList } = get();
        if (compareList.length >= 2) return 'MAX'; // 💡 3 -> 2로 변경

        const realGameId = game.gameId || game.id;
        if (compareList.some(item => (item.gameId || item.id) === realGameId)) return 'EXISTS';

        set({ compareList: [...compareList, game] });
        return 'SUCCESS';
    },

    removeFromCompare: (gameId) => {
        set({ compareList: get().compareList.filter(item => (item.gameId || item.id) !== gameId) });
    },

    clearCompare: () => set({ compareList: [] }),
}));