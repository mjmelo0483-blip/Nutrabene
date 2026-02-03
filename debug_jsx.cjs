
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\mjmelo\\Desktop\\Nutrabene\\nutrabene---nutrição-inteligente\\components\\AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let braces = 0;
let parens = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 2634) { // Line before <main>
        level = 0;
        braces = 0;
        parens = 0;
    }

    // Count ONLY <div, <h1, <h2, <h3, <h4, <p, <span, <table, <thead, <tbody, <tr, <th, <td, <button, <select, <input, <form, <header, <section, <aside, <footer, <main, <a, <label, <strong, <ul, <li
    const opens = (line.match(/<(div|h\d|p|span|table|thead|tbody|tr|th|td|button|select|input|form|header|section|aside|footer|main|a|label|strong|ul|li|React\.Fragment|Fragment|svg|path|g|circle|rect|line|polyline|polygon|ellipse|text|tspan|defs|clipPath|mask)[^>]*>/g) || []).length;
    const closes = (line.match(/<\/(div|h\d|p|span|table|thead|tbody|tr|th|td|button|select|input|form|header|section|aside|footer|main|a|label|strong|ul|li|React\.Fragment|Fragment|svg|path|g|circle|rect|line|polyline|polygon|ellipse|text|tspan|defs|clipPath|mask)>/g) || []).length;
    const selfCloses = (line.match(/<[^>]+\/>/g) || []).length;

    level += (opens - closes - selfCloses);

    const bOpens = (line.match(/\{/g) || []).length;
    const bCloses = (line.match(/\}/g) || []).length;
    braces += bOpens - bCloses;

    const pOpens = (line.match(/\(/g) || []).length;
    const pCloses = (line.match(/\)/g) || []).length;
    parens += pOpens - pCloses;

    if (i > 2630 && i < 3500) {
        console.log(`${i + 1}: L=${level} B=${braces} P=${parens} | ${line.trim().substring(0, 40)}`);
    }
}
