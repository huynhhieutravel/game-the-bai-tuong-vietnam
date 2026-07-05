export const getFullPlayerName = (p, meId) => {
    if (!p) return 'Ai đó';
    if (p.id === meId) return 'Bạn';
    
    if (p.isRevealed && p.heroes && p.heroes.length > 0) {
        const h0 = (p.revealedHeroes && p.revealedHeroes[0]) ? p.heroes[0]?.name : null;
        const h1 = (p.revealedHeroes && p.revealedHeroes[1]) ? p.heroes[1]?.name : null;
        
        if (h0 && h1) {
            return `${h0} & ${h1} (Bot ${p.id})`;
        } else if (h0) {
            return `${h0} (Bot ${p.id})`;
        } else if (h1) {
            return `${h1} (Bot ${p.id})`;
        }
    }
    
    return `Bot ${p.id}`;
};

export const getPlayerFaction = (player) => {
    if (!player) return null;
    if (!player.isRevealed || !player.heroes || player.heroes.length === 0) return null;
    
    let faction = player.faction || player.heroes[0]?.faction;
    
    const datrach = player.skills?.find(s => s.id === 'da-trach');
    if (datrach && datrach.chosenFaction) {
        faction = datrach.chosenFaction;
    }
    return faction;
};

export const isPlayerRevealed = (player) => {
    if (!player) return false;
    return player.isRevealed === true;
};

export const getHeroNameStr = (p) => {
    if (!p || !p.heroes) return "Chưa lật";
    const h0 = (p.revealedHeroes && p.revealedHeroes[0]) ? p.heroes[0]?.name : null;
    const h1 = (p.revealedHeroes && p.revealedHeroes[1]) ? p.heroes[1]?.name : null;
    
    if (h0 && h1) return `${h0} & ${h1}`;
    if (h0) return h0;
    if (h1) return h1;
    return "Chưa lật";
};
