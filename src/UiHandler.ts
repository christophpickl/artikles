
import { randomUuid } from './common';
import { Article } from './domain';
import { ArticleRepo } from './Articles';
const { ipcMain } = require('electron');

export default class UiHandler {
    constructor(
        private readonly articleRepo: ArticleRepo
    ){}

    init() {
        console.log("init()");

        ipcMain.on('preloaded', (event, argDocument) => {
            console.log("document: " + argDocument)
            //event.reply('preloaded-reply', 'foobar');
        });

          return;

        document.addEventListener('keydown', function(event) {
            const key = event.key; // Or const {key} = event; in ES6+
            if (event.metaKey && key == "f") {
                document.getElementById("inpSearch")!.focus();
            }
        });

        this.resetArticleList()
        document.getElementById("btnCancelSearch")!.hidden = true;

        document.getElementById("btnCreate")!.addEventListener("click", this.onCreateClicked); 
        document.getElementById("btnUpdate")!.addEventListener("click", this.onUpdateClicked); 
        document.getElementById("btnCancel")!.addEventListener("click", this.onCancelClicked); 
        document.getElementById("btnDelete")!.addEventListener("click", this.onDeleteClicked); 
        this.registerSearchListener();
        
        this.switchButtonsToCreateMode(true);
    }
    
    onCreateClicked() {
        console.log("onCreateClicked()");
    
        var article = this.readArticleFromUI(randomUuid());
        if(!this.validateArticle(article)) {
            return;
        }
        this.articleRepo.saveArticle(article);
        this.resetArticleList();
        this.resetInputs();
    }

    onUpdateClicked() {
        console.log("onUpdateClicked()");
        let article = this.readArticleFromUI();
        if(!this.validateArticle(article)) {
            return;
        }
        this.articleRepo.updateArticle(article);
        this.resetArticleList();
    }

    onCancelClicked() {
        console.log("onCancelClicked()");
        this.resetInputs();
    }

    onDeleteClicked() {
        console.log("onDeleteClicked()");
        this.articleRepo.deleteArticle(this.getInputValue("inpId"));
        this.resetArticleList();
        this.resetInputs();
    }

    onArticleTitleClicked(article: Article) {
        this.scrollToTop();
        this.updateArticleForm(article);
    }

    onArticleTagClicked(tag: string) {
        let oldSearch = this.getInputValue("inpSearch");
        let tagHashed = "#" + tag;
        let newSearch = (oldSearch.length == 0) ? tagHashed  : oldSearch + " " + tagHashed;
        this.setInputValue("inpSearch", newSearch);
        this.onSearchInput();
    }

    // SEARCH
    // ------------========================================================------------

    registerSearchListener() {
        document.getElementById("inpSearch")!.addEventListener("input", this.onSearchInput); 
        document.getElementById("inpSearch")!.addEventListener('keydown', (event) => {
            const key = event.key; // Or const {key} = event; in ES6+
            if (key === "Escape") {
                this.resetSearch();
            }
        });
        document.getElementById("btnCancelSearch")!.addEventListener("click", this.resetSearch); 
    }

    onSearchInput() {
        let searchTerm: string = this.getInputValue("inpSearch").trim()
        let terms = searchTerm.split(" ").filter((it) => { return it.length != 0});
        console.log("onSearchInput("+searchTerm+") => terms:", terms);
        if (terms.length == 0) {
            this.resetSearch();
            return;
        }
        document.getElementById("btnCancelSearch")!.hidden = false;
        let articles = this.articleRepo.searchArticles(terms);
        this.removeAndPrependArticleNodes(articles);
    }

    resetSearch() {
        this.setInputValue("inpSearch", "");
        document.getElementById("btnCancelSearch")!.hidden = true;
        this.articleRepo.disableSearch();
        this.resetArticleList();
    }

    // UI LOGIC
    // ------------========================================================------------

    readArticleFromUI(givenId: string | undefined = undefined): Article {
        return new Article(
            (givenId !== undefined) ? givenId : this.getInputValue("inpId"),
            this.getInputValue("inpTitle"),
            this.getInputValue("inpTags").split(" ").filter(function(it) { return it.length > 0; }),
            this.getInputValue("inpBody")
        );
    }

    updateArticleForm(article: Article) {
        this.setInputValue("inpId", article.id);
        this.setInputValue("inpTitle", article.title);
        this.setInputValue("inpTags", article.tags.join(" "));
        this.setInputValue("inpBody", article.body);
        this.switchButtonsToCreateMode(false);
    }

    resetInputs() {
        this.setInputValue("inpId", "");
        this.setInputValue("inpTitle", "");
        this.setInputValue("inpTags", "");
        this.setInputValue("inpBody", "");
        this.switchButtonsToCreateMode(true);
    }

    resetArticleList() {
        let articles = this.articleRepo.loadArticles();
        this.removeAndPrependArticleNodes(articles);
    }


    removeAndPrependArticleNodes(articles: Article[]) {
        let articleList = document.getElementById("articleList")!;
        this.removeAll(articleList);
        articles.forEach((article) => {
            articleList.prepend(this.createArticleNode(article));
        });
        this.fillTagsSummary(articles);
    }

    fillTagsSummary(articles: Article[]) {
        let allTagsCounted = new Map<string, number>();
        articles.forEach((article) => {
            article.tags.forEach((tag) => {
                if (!allTagsCounted.has(tag)) {
                    allTagsCounted.set(tag, 0);
                }
                let oldTagCount = allTagsCounted.get(tag)!;
                allTagsCounted.set(tag, oldTagCount + 1);
            });
        });
        let sortedTags = Array.from(allTagsCounted.keys()).sort() as string[];

        let tagsNode = document.getElementById("tagsSummary")!;
        this.removeAll(tagsNode);
        
        sortedTags.forEach(tagName => {
            let tagNode = document.createElement("a");
            tagNode.innerText = "#" + tagName + "(" + allTagsCounted.get(tagName) + ") ";
            tagNode.href = "#";
            tagNode.classList.add("tagSummaryLink");
            tagNode.onclick = () => { this.onArticleTagClicked(tagName); };
            tagsNode.appendChild(tagNode);
        });
    }

    private removeAll(node: HTMLElement) {
        while (node.firstChild) {
            node.removeChild(node.lastChild!);
        };
    }

    // MISC
    // ------------========================================================------------

    // TODO move inside article
    validateArticle(article: Article): boolean {
        if (article.title.trim().length == 0) {
            alert("Title must not be empty!");
            return false;
        }
        return true;
    }

    createArticleNode(article: Article) {
        let articleTitle = document.createElement("h1");
        articleTitle.classList.add("articleTitle");
        let articleTitleLink = document.createElement("a");
        articleTitleLink.innerText = article.title;
        articleTitleLink.href = "#";
        articleTitleLink.onclick = () => { this.onArticleTitleClicked(article); };
        articleTitle.appendChild(articleTitleLink);

        let articleTags = document.createElement("p");
        articleTags.classList.add("articleTags");

        article.tags.forEach((tag) => {
            let tagNode = document.createElement("a");
            tagNode.classList.add("clickableTag");
            tagNode.innerText = "#" + tag;
            tagNode.href = "#";
            tagNode.onclick = () => { this.onArticleTagClicked(tag); };
            articleTags.appendChild(tagNode);
        });

        let articleBody = document.createElement("p");
        articleBody.classList.add("articleBody");
        articleBody.innerText = article.body;

        let articleNode = document.createElement("div");
            articleNode.classList.add("articleNode");
            articleNode.appendChild(articleTitle);
            articleNode.appendChild(articleTags);
            articleNode.appendChild(articleBody);
        return articleNode;
    }

    switchButtonsToCreateMode(isCreateMode: boolean) {
        IndexHtml.btnCreate().hidden = isCreateMode ? false : true;
        document.getElementById("btnUpdate")!.hidden = isCreateMode ? true : false;
        document.getElementById("btnCancel")!.hidden = isCreateMode ? true : false;
        document.getElementById("btnDelete")!.hidden = isCreateMode ? true : false;
    }

    // COMMON
    // ------------========================================================------------

    getInputValue(selector: string): string {
        return (<HTMLInputElement>document.getElementById(selector)).value;
    }

    setInputValue(selector: string, newValue: string) {
        (<HTMLInputElement>document.getElementById(selector)).value = newValue;
    }

    scrollToTop() {
        document.body.scrollTop = 0; // safari
        document.documentElement.scrollTop = 0; // chrome, firefox, IE, opera
    }

}

class IndexHtml {
    private static ID_BTN_CREATE = "btnCreate";

    static btnCreate(): HTMLElement {
        return document.getElementById(IndexHtml.ID_BTN_CREATE)!;
    }
}