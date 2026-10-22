# Running a workshop

This guide is for workshop leaders. It covers room links, what participants see, how the leaderboard works, how to end a workshop and how many people can join at once. The live site is https://unlock-the-lab.web.app.

## Before the workshop

1. **Choose a room code.** A room code gives your group its own leaderboard view and dashboard filter. Codes have 2 to 20 characters: capital letters, digits and hyphens, starting with a letter or digit, such as `OXFORD-1`. Lower-case letters in a link are turned into capitals. Use a new code for each separate workshop: everyone who joins with the same code shares a leaderboard.
2. **Make the links.** Sign in to the facilitator panel at `/admin.html` (see `docs/deployment.md` for how to become an administrator) and enter the code under 'Room links'. You get:
    - the workshop link for participants, `https://unlock-the-lab.web.app/?room=CODE`;
    - a dashboard link for the room, `https://unlock-the-lab.web.app/dashboard.html?room=CODE`;
    - a QR code of the workshop link, which you can download as a PNG for slides or handouts.

    You can also type these links by hand. The panel tells you if the code has been used before.

3. **Check the capacity** (see below) if you expect a large group.
4. **Handouts.** The files in `materials/workshop` (evaluation guide, glossary and sample studies) were made before content version 2. A few study texts have changed since, so treat the app as the reference.

## During the workshop

Participants open the workshop link, read the welcome page and select 'Get started'. Each participant gets a random nickname, such as 'Curious Otter 42'. No names or email addresses are asked for.

For each of the 48 studies, which are fictional, participants:

1. predict the average rating that workshop participants give the study ('Predict the crowd'), on a scale from 1 to 7;
2. give their own rating on the same scale;
3. see their score, the target their prediction was scored against and the expert's feedback on each of the six criteria.

**Scoring.** A prediction is scored against a target that combines the ratings other participants have given the study so far with an expert's rating, which counts as if 100 people had given it. A prediction that matches the target scores 100 points, and each point of distance costs 12 points. Because the expert counts so heavily, the target stays close to the expert's rating for a long time. The target always uses ratings from every room, so scores can be compared between workshops.

**Finishing.** Participants can finish at any point after rating 10 studies. They then share out 20 tokens across the six criteria to show which ones they think matter most, and see their results. A message after 12 studies reminds them that they can finish.

**The leaderboard.** People are ranked by their average score per study, once they have rated at least 10 studies. When two people have the same average, shown as a whole percentage, the one who rated more studies ranks higher; if that is equal too, they share the place. People with fewer than 10 studies are not ranked yet; the dashboard counts them below the list. On the dashboard, choose your room in the room filter (or use the room's dashboard link) to show only your group, which suits a projected screen. On their results page, participants in a room can switch the top 5 between their workshop and everyone.

**Inactivity.** After 25 minutes without activity, a participant sees 'Are you still there?'. After 30 minutes the session pauses and stops counting as active. 'Continue' resumes it where it left off, with nothing lost.

**Shared computers.** Progress is kept in the browser, so a reload resumes the same session. On a shared computer, the next person should select 'Start as a new participant' at the foot of the page. The same option appears if someone opens a room link while the browser still holds a session from another room.

## Ending the workshop

In the facilitator panel, 'End all active sessions' closes every session that started before that moment, including those whose page is shut. Participants see 'The facilitator has closed this session' and can no longer save answers. Their answers so far are kept. Anyone who has rated at least 10 studies can still see their results, and everyone can start again as a new participant. It also clears the 'Active now' figure.

Each participant's results stay available at a personal link of the form `https://unlock-the-lab.web.app/?session=<id>`. The results page offers to copy or email it. Anyone who lost it can find their results on the dashboard under 'Find your results', by nickname.

## How many people can join at once

The site runs on Firebase's free Spark plan, which allows at most 100 simultaneous connections to the database. Every open page uses one: each participant's workshop page, each dashboard (a projected one included) and each facilitator panel. When the limit is reached, new visitors cannot connect until others leave. The facilitator panel's 'Active now' figure approximates the number in use; the Usage tab of the Realtime Database in the Firebase console shows the real one.

For a group close to 100, close dashboards and facilitator panels you do not need, or ask the project owner about moving to the pay-as-you-go Blaze plan, which allows far more connections.

## Data and privacy

Everything participants submit is public and pseudonymous: the answers and scores under each nickname appear on the leaderboard, the dashboard and the results pages, and a copy of the data is published every day in the project's GitHub repository. The welcome page tells participants this before they start. `docs/data.md` describes every field that is stored.
