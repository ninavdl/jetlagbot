const replaceChars = [
    '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'
]

const replaceRegex = new RegExp("([" +
    replaceChars.map(char => '\\' + char).join("|")
    + "])", 'g');

export function escapeMarkdown(str: string): string {
    return str.replace(replaceRegex, '\\$1');
}

/** Returns random number between 0 and maxExclusive */
export function random(maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive);
}

export function chooseRandom<T>(values: T[]): T {
    return values[random(values.length)];
}

export function chooseNRandom<T>(values: T[], n: number): T[] {
    if(n > values.length) throw new Error("n has to be lower than the arrays length");
    let i = 0;
    const result = [];
    const takenIndices = [];
    while(result.length < n) {
        let i = random(values.length);
        if(takenIndices.includes(i)) continue;
        result.push(values[i]);
        takenIndices.push(i);
    }
    return result;
}