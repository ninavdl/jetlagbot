import { PrimaryGeneratedColumn, Column } from "typeorm";


export class GameObject {
    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    createdAt: Date

    constructor() {
        this.createdAt = new Date();
    }
}
