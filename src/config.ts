export interface Config {
    mapboxPulicKey: string;
    telegramBotToken: string;
    publicUrl: string;
    database: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    }
}