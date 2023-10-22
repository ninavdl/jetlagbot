const replaceChars = [
    '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'
]

const replaceRegex = new RegExp("([" +
    replaceChars.map(char => '\\' + char).join("|")
    + "])", 'g');

export function escapeMarkdown(str: string): string {
    return str.replace(replaceRegex, '\\1');
}

/** Returns random number between 0 and maxExclusive */
export function random(maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive);
}

export function chooseRandom<T>(values: T[]): T {
    return values[random(values.length)];
}