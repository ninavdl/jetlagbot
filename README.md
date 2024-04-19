# Jetlag bot

This is a telegram bot to help you play a game similar to the web show [Jet Lag: The Game](https://en.wikipedia.org/wiki/Jet_Lag:_The_Game) season 4 with your friends in the real world.

## The Game

### Structure

The map is divided into regions and subregions. This could for example be districts and communes.
Further required is a list of challenges, battle challenges, and curses.

When the game is started, each team gets a list of 5 challenges on their hand. One challenge can be on the hand of multiple teams, but one team can only have each challenge once.

### Challenges

Each team can travel (e.g. only by public transport) through the map. When they are in a subregion, they can complete a challenge to claim this subregion. A challenge can be something like "find the highest building in your subregion".

Also, each challenge rewards a defined amount of stars, for which the team can buy different powerups.

When the challenge is completed, it is exchanged for a new challenge on the team's hand.

If a subregion is claimed, another team can't claim it by completing a challenge there.

### Battle challenges

When a team has claimed two subregions bordering another subregion, they can travel to that subregion and initate a battle challenge against the team currently holding the attacked subregion.
If the attacking team wins, they claim the subregion.

After completion of the battle challenge, the subregion is locked, and no further battle challenge can be started for this subregion (irregardless of who won the battle challenge).

### Powerups

With the stars gained by completing challenges, a team can buy the following powerups:

#### Curse (2 stars)

A random curse is selected. This curse can then be used once to curse another team.
A curse could be something like "You are not allowed to talk to your teammates for 30min".

#### Curse Immunity (2 stars)

Your team can't be cursed for 30min.

#### Location off (2 stars)

Your team is allowed to disable their trackers for 1 hour.

#### Card swap (3 stars)

You can select another team, and steal three of their challenges. In return, you have to select three of your challenges to give to the other team.

#### Reshuffle (3 stars)

All challenges on your hand are returned to the deck and five new random challenges are assigned.

#### Direct claim (7 stars)

You can claim the subregion you are currently in without completing a challenge.

### Points

* For each subregion a team has claimed, they are rewarded one point.
* For each region in which a team has claimed at least one subregino, they are rewarded two points.
* For each team, the sum of the area of their claimed subregions is calculated. For each 100km², the team gets one point.

## Example

We played the game in the [Meuse-Rhine Euregion](https://en.wikipedia.org/wiki/Meuse%E2%80%93Rhine_Euroregion). The euregion was divided into the governmental districts according to NUTS-3 regions:
* Germany:
    * Städteregion Aachen
    * Kreis Düren
    * Kreis Euskirchen
    * Kreis Heinsberg
* Belgium:
    * Deutschsprachige Gemeinschaft
    * Liège
    * Verviers
    * Waremme
    * Huy
    * Hasselt
    * Maaseik
    * Tongeren
* Netherlands
    * Midden-Limburg
    * Zuid-Limburg

For the subregions, those regions were futher divided into their respective local administrative units.

## The bot

### Setup

The bot requires the following environment variables as configuration:

* `JETLAG_MAPBOX_PUBLIC_KEY`: A public key for mapbox.com (required to show maps)
* `JETLAG_BOT_TOKEN`: Token of a telegram bot
* `JETLAG_PUBLIC_URL`: URL where the bots HTTP server is reachable from the internet
* `JETLAG_PG_HOST`: Hostname of postgresql database server
* `JETLAG_PG_PORT`: Port of postgresql database server
* `JETLAG_PG_USER`: Username for postgres database server
* `JETLAG_PG_PASSWORD`: Password for postgres database server
* `JETLAG_PG_DATABASE`: Postgres database name

To install the bots dependencies, run `npm install`.

To start the bot, run `npm run start`.

The bot will also start a webserver on port 8080, which should be reachable from the URL configured as `JETLAG_PUBLIC_URL`. This is currently only used to display a map.

### Runtime configuration

The bot has to be added to a telegram group. To configure it, use the following commands:

* `/createGame`: Has to be run once in the group to initialize the game.
* `/createTeam`: Creates a team
* `/hello`: Each player **must** run this command in a private chat with the bot, so that the bot knows how to contact the player privately.
* `/joinTeam`: Each player must join one team.

Use `/import`, to import game data.
When a CSV is required, the columns have to be separated by semicolon. The first line of the CSV may contain a headline and is skipped.

#### Challenges

A CSV with the following columns (in that order) is required:

* Title
* Description
* Number of stars
* Number of subregions claimed by the challenge
* Is the number of gained stars selectable by the team? ("true" or "false")

#### Battle Challenges

A CSV with the following columns (in that order) is required:

* Title
* Description
* Time limit in minutes (optional)

#### Curses

A CSV with the following columns (in that order) is required:

* Title
* Description
* Time limit in minutes (optional)

#### GeoJSON

A GeoJSON file is required to define the game regions and subregions, and to draw the map of claimed subregions.

The file should contain a list of GeoJSON features.
They must have the following properties:

* `LAU_ID`: unique identifier of the subregion
* `NUTS3_CODE`: unique identifier of the region that contains the subregion
* `LAU_NAME`: Display name of the subregion
* `NUTS3_NAME`: Display name of the region that contains the subregion
* `AREA_KM2`: Area in km² of the subregion

### During the game

To start the game, issue the `/start` command in the group. 

#### Claiming subregions

* A player can use the `/completeChallenge` command to mark a subregion as claimed. They have to select the challenge that they completed. Other players will be notified that the subregion was claimed.

#### Buying powerups

* Using the `/powerup` command, it is possible to exchange the stars gained by completing challenges for a powerup.

#### Cursing

* Using the `/curse` command, a team can curse another team with a curse they have bought using the `/powerup` command. The other team will be notified about the curse.
* Using `/listcurses`, a team can see if they are currently cursed, and remove a curse when it is completed.

#### Battle challenges

* Using the `/attack` command, a team can initate a battle challenge against another team. A random battle challenge will be selected and the other team will be notified.
* When the battle challenge is completed, the `/finishattack` command has to be used to select which team has won the battle challenge.

#### Game status

* Using `/leaderboard`, you can see the current points for each team.
* Using `/map`, you can open a map showing which subregions are currently claimed by which team.
* Using `/subregions`, you can list the currently claimed subregions.
* Using `/teamstatus`, you can see your current number of claimed subregions and current number of stars.