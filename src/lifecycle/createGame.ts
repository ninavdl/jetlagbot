import { GameLifecycleAction } from "./lifecycle";
import { Game } from "../models/Game";
import { Challenge } from "../models/Challenge";
import { Region } from "../models/Region";
import { Subregion } from "../models/Subregion";
import { BattleChallenge } from "../models/BattleChallenge";
import { Curse } from "../models/Curse";


export type CreateGameArgs = {name: string, telegramMainChatId: number};

export class CreateGame extends GameLifecycleAction<Game, CreateGameArgs> {
    public async run(): Promise<Game> {
        let game = new Game();
        game.name = this.args.name;
        game.mainTelegramChatId = this.args.telegramMainChatId;
        game.allChallenges = [];
        game.allBattleChallenges = [];

        // Create some demo data
        // Later this should be imported from CSV

        let challenges = [];
        for(let i = 0; i<20; i++) {
            let challenge = new Challenge();
            challenge.name = "Test Challenge " + i;
            challenge.description = "bla bla bla " + i;
            challenge.stars = Math.floor(Math.random() * 3);
            challenge.awardsSubregions = Math.floor(Math.random() * 2) + 1;
            challenge.game = game;
            game.allChallenges.push(challenge);
            challenges.push(challenge);
        }

        let battleChallenges = [];
        for(let i = 0; i < 5; i++) {
            let battleChallenge = new BattleChallenge();
            battleChallenge.name = "Battle Challenge " + i;
            battleChallenge.description = "bla bla bla";
            battleChallenge.timeInMinutes = 15;
            battleChallenge.game = game;
            game.allBattleChallenges.push(battleChallenge);
            battleChallenges.push(battleChallenge);
        }

        let regions = [
            new Region(), new Region()
        ];
        regions[0].game = game;
        regions[0].name = "Region 0",
        regions[0].subregions = [];
        regions[1].game = game;
        regions[1].name = "Region 1";
        regions[1].subregions = [];

        let subregions = [];
        for (let i = 0; i < 20; i++) {
            let subregion = new Subregion();
            subregion.name = "Subregion " + i;
            subregion.region = regions[i < 10 ? 0 : 1];
            subregion.region.subregions.push(subregion);
            subregions.push(subregion);
        }

        let curses = [];
        for(let i = 0; i < 10; i++) {
            let curse = new Curse();
            curse.name = "Curse " + i;
            curse.game = game;
            curse.description = "bla bla bla";
            curses.push(curse);
        }

        await this.entityManager.save([
            game,
            ...challenges,
            ...battleChallenges,
            ...curses,
            ...regions,
            ...subregions,
        ]);

        return game;
    }
}