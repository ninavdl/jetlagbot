const replaceChars = [
    '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'
]

const replaceRegex = new RegExp("([" +
    replaceChars.map(char => '\\' + char).join("|")
    + "])", 'g');

export function escapeMarkdown(str: string): string {
    return str.replace(replaceRegex, '\\1');
}