import { Equal } from "typeorm";
import { Curse } from "../../models/Curse";
import { CurseAssignment } from "../../models/CurseAssignment";
import { Player } from "../../models/Player";
import { User } from "../../user";
import { GameError, GameLifecycleAction } from "../lifecycle";
import { SupplyPlayer } from "../helper/supplyPlayer";
import { chooseRandom } from "../../util";

export type DrawCurseArgs = { user: User, requiredStars: number };

export class DrawCurse extends GameLifecycleAction<CurseAssignment, DrawCurseArgs> {
    public async run(): Promise<CurseAssignment> {
        const player: Player = await this.callSubAction(SupplyPlayer, {
            user: this.args.user,
            withTeam: true
        });

        if(player.team.stars < this.args.requiredStars) {
            throw new GameError("Not enough stars");
        }

        const curses = await this.entityManager.getRepository(Curse).findBy({
            game: Equal(this.game.uuid)
        });

        const curse = chooseRandom(curses);

        const assignment = new CurseAssignment();
        assignment.ownerTeam = player.team;
        assignment.curse = curse;

        player.team.stars -= this.args.requiredStars;

        await this.entityManager.save(assignment);
        await this.entityManager.save(player.team);

        return assignment;
    }
}