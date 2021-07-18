
const ix_map = Array(11).fill(0).map((_, i) => Math.pow(2, i + 1));
const ix_rev = Object.fromEntries(ix_map.map((e,i) => [e, i+1]));

const themes = {

    // tan -> maroon theme
    'tan/maroon': {
        'name': 'tan/maroon',
        'fills': ['#F3DD84', '#FFFFCC', '#FFF0A8', '#FEE186', '#FEC965', '#FDAA48', '#FD8D3C', '#FC5A2D', '#EC2E21', '#D30F20', '#B00026', '#800026'],
        'strokes': ['#5E3B07', '#BBBB54', '#C0AE36', '#C1A309', '#C19107', '#C07A01', '#C16404', '#C03D10', '#AF261E', '#A00A16', '#88001B', '#65001C'],
        'txt_col': ['#6F614C', '#7A7A05', '#7E7104', '#7E6901', '#7F5E01', '#7F4F00', '#814100', '#842500', '#7F0900', '#FF9295', '#FF8089', '#E67686'],
        'bg_fill': '#F3DD84',  // bg tiles
        'bg_line': '#5E3B07',
        'bg_text': '#6F614C',
        'new_fill': '#EEAF66', // new tiles
        'new_line': '#7C5416',
        'new_text': '#901F28',
        'body_bg': '#927736',  // <body> of page
        'box_bg': '#96a696',   // box containing board + score
        'score_bg': '#443322', // score box
        'score_text': '#ffebcd'
    },
    // green -> purple theme
    "green/purple": {
        'name': 'green/purple',
        'fills': ['#8d9e91', '#9FDA3A', '#71CF57', '#4AC16D', '#2DB27D', '#1FA187', '#21908C', '#277F8E', '#2E6E8E', '#365C8D', '#3F4889', '#46337E'],
        'strokes': ['#5d2489', '#71A015', '#4D9836', '#418C55', '#27835C', '#097763', '#006C68', '#095F6C', '#1C536D', '#2A4569', '#303767', '#362568'],
        'txt_col': ['#6F614C', '#486903', '#246600', '#145F2D', '#04583A', '#015041', '#034846', '#01414A', '#85B6D7', '#8DAADB', '#979DDB', '#9E91D3'],
        'bg_fill': '#8d9e91',
        'bg_line': '#5d2489',
        'bg_text': '#6F614C',
        'new_fill': '#B7ADDA',
        'new_line': '#7769A4',
        'new_text': '#448578',
        'body_bg': '#4E2D5C',
        'box_bg': '#1a4223',
        'score_bg': '#441757',
        'score_text': '#F7F9C7'
    }
};

/* theme colors needed for drawing tile */
function theme_colors(themeName, n) {
    const ix = ix_rev[n] || 0;
    const theme = themes[themeName];
    return [theme.fills[ix], theme.strokes[ix], theme.txt_col[ix]];
}

export {themes, theme_colors};
