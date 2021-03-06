let fs = require("fs");

export interface DataMigrator {
    migrate()
}

export class NoOpDataMigrator implements DataMigrator {
    public migrate() {
        console.log("no op migrator :)");
    }
}

export class JsonDataMigrator {

    public static readonly APPLICATION_VERSION = 4;

    constructor(
        private readonly jsonFilePath: string
    ) {
    }

    public migrate() {
        if (!fs.existsSync(this.jsonFilePath)) {
            return
        }

        let json = JSON.parse(fs.readFileSync(this.jsonFilePath, 'utf8').toString());
        let currentVersion = <number>json.version;
        if (currentVersion == JsonDataMigrator.APPLICATION_VERSION) {
            return;
        }

        let nextVersion = currentVersion + 1;
        console.log("MIGRATING");
        console.log("=========");
        console.log("migrating data version from " + currentVersion + " -> " + nextVersion + " for file: " + this.jsonFilePath);

        if (nextVersion == 2) {
            let date = new Date("2020-01-01T00:00:00+0000");
            json.articles.forEach(article => {
                article.created = date;
                article.updated = date;
                article.likes = 0;
                date = new Date(date.getTime() + 1_000);
            });
            nextVersion++;
        }
        if (nextVersion == 3) {
            json.articles.forEach(article => {
                article.isDeleted = false;
                article.tags = article.tags.sort()
            });
            nextVersion++;
        }
        if (nextVersion == 4) {
            const oldArticles = json.articles;
            json.articles = {
                list: oldArticles
            };
            nextVersion++;
        }
        json.version = JsonDataMigrator.APPLICATION_VERSION;
        fs.writeFileSync(this.jsonFilePath, JSON.stringify(json));
    }
}
