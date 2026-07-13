const KEY = 'ps-recent-games';
const MAX = 10;

export function pushRecentGame(game) {
    try {
        const list = getRecentGames();
        const filtered = list.filter(g => g.id !== game.id);
        const updated = [game, ...filtered].slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(updated));
    } catch {}
}

export function getRecentGames() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
        return [];
    }
}

export function clearRecentGames() {
    localStorage.removeItem(KEY);
}
