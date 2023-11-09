
interface BoardTheme {
    fills: Array<string>;
    strokes: Array<string>;
    text_color: Array<string>;
    // bg tiles
    bg_fill: string;
    bg_line: string;
    bg_text: string;
    // new tiles
    new_fill: string;
    new_line: string;
    new_text: string;
    // <body> of page
    body_bg: string;
    // box containing board + score
    box_bg: string;
    score_bg: string;
    score_text: string;
};

const tanMaroonTheme: BoardTheme = {

    'fills': ['#F3DD84', '#FFFFCC', '#FFF0A8', '#FEE186', '#FEC965', '#FDAA48', '#FD8D3C', '#FC5A2D', '#EC2E21', '#D30F20', '#B00026', '#800026'],
    'strokes': ['#5E3B07', '#BBBB54', '#C0AE36', '#C1A309', '#C19107', '#C07A01', '#C16404', '#C03D10', '#AF261E', '#A00A16', '#88001B', '#65001C'],
    'text_color': ['#6F614C', '#7A7A05', '#7E7104', '#7E6901', '#7F5E01', '#7F4F00', '#814100', '#842500', '#7F0900', '#FF9295', '#FF8089', '#E67686'],
    'bg_fill': '#F3DD84',
    'bg_line': '#5E3B07',
    'bg_text': '#6F614C',
    'new_fill': '#EEAF66',
    'new_line': '#7C5416',
    'new_text': '#901F28',
    'body_bg': '#927736',
    'box_bg': '#96a696',
    'score_bg': '#443322',
    'score_text': '#ffebcd'
};

const greenPurpleTheme: BoardTheme = {
    'fills': ['#8d9e91', '#9FDA3A', '#71CF57', '#4AC16D', '#2DB27D', '#1FA187', '#21908C', '#277F8E', '#2E6E8E', '#365C8D', '#3F4889', '#46337E'],
    'strokes': ['#5d2489', '#71A015', '#4D9836', '#418C55', '#27835C', '#097763', '#006C68', '#095F6C', '#1C536D', '#2A4569', '#303767', '#362568'],
    'text_color': ['#6F614C', '#486903', '#246600', '#145F2D', '#04583A', '#015041', '#034846', '#01414A', '#85B6D7', '#8DAADB', '#979DDB', '#9E91D3'],
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
};

const themes = {
    'tan/maroon': tanMaroonTheme,
    "green/purple": greenPurpleTheme
};

export { BoardTheme, themes };
