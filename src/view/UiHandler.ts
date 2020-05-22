import {Article} from '../domain';
import IndexHtml from './IndexHtml';
import {ArticleService} from "../ArticleService";
import {EventBus} from "../EventBus";
import {
    EditArticleEvent,
    CreateEvent,
    DeleteEvent,
    UpdateEvent,
    CancelEditArticleEvent,
    CancelSearchEvent, SearchEvent
} from "./events";
import {findChildByAttribute, removeAllChildren} from "../common";

export default class UiHandler {
    constructor(
        private readonly articleService: ArticleService,
        private readonly eventBus: EventBus
    ) {
    }

    private static readonly ATTR_ARTIFACT_ID = "data-artifactId";
    private static readonly CLASS_TITLE = "articleTitle";
    private static readonly CLASS_TAGS = "articleTags";
    private static readonly CLASS_BODY = "articleBody";

    public init() {
        console.log("init()");

        IndexHtml.inpTitle().focus();
        IndexHtml.btnCancelSearchVisible(false);
        IndexHtml.switchButtonsToCreateMode(true);

        this.resetArticleList(this.articleService.loadArticles()); // TODO let externally initializen

        this.initSearchListener();
        this.initCrudButtonListener();
        document.addEventListener('keydown', function (event) {
            const key = event.key; // Or const {key} = event; in ES6+
            if (event.metaKey && key == "f") {
                document.getElementById("inpSearch")!.focus();
            }
        });
    }

    // SEARCH
    // ------------========================================================------------

    private initSearchListener() {
        IndexHtml.onInpSearchInput(() => {
            this.eventBus.dispatch(new SearchEvent(IndexHtml.inpSearch().value));
        });
        IndexHtml.inpSearch().addEventListener("keydown", (event) => {
            const key = event.key; // Or const {key} = event; in ES6+
            if (key == "Escape") {
                this.eventBus.dispatch(new CancelSearchEvent());
            }
        });
        IndexHtml.onClick(IndexHtml.btnCancelSearch(), () => {
            this.eventBus.dispatch(new CancelSearchEvent());
        });
    }

    public showBtnCancelSearch() {
        IndexHtml.btnCancelSearch().hidden = false;
    }

    public resetSearch() {
        IndexHtml.inpSearch().value = "";
        IndexHtml.btnCancelSearch().hidden = true;
    }

    private onArticleTagClicked(clickedTag: string) {
        let oldSearch = IndexHtml.inpSearch().value;
        let tagHashed = "#" + clickedTag;
        IndexHtml.inpSearch().value = (oldSearch.length == 0) ? tagHashed : oldSearch + " " + tagHashed;
        this.eventBus.dispatch(new SearchEvent(IndexHtml.inpSearch().value));
    }

    // PUBLIC
    // ------------========================================================------------

    public writeArticleUpdatedInputValue(updated: string) {
        IndexHtml.inpUpdated().value = updated;
    }

    public readArticleFromUI(givenId: string | undefined = undefined): Article {
        return new Article(
            (givenId !== undefined) ? givenId : IndexHtml.inpId().value,
            IndexHtml.inpTitle().value,
            IndexHtml.inpTags().value.split(" ").filter(function (it) {
                return it.length > 0;
            }),
            IndexHtml.inpBody().value,
            new Date(IndexHtml.inpCreated().value),
            new Date(IndexHtml.btnUpdate().value),
            parseInt(IndexHtml.inpLikes().value)
        );
    }

    public updateArticleForm(article: Article) {
        IndexHtml.inpId().value = article.id;
        IndexHtml.inpTitle().value = article.title;
        IndexHtml.inpTags().value = article.tags.join(" ");
        IndexHtml.inpBody().value = article.body;
        IndexHtml.inpCreated().value = article.created.toString();
        IndexHtml.inpUpdated().value = article.updated.toString();
        IndexHtml.inpLikes().value = article.likes.toString();
        IndexHtml.switchButtonsToCreateMode(false);
        IndexHtml.inpTitle().focus();
    }

    public resetArticleForm() {
        IndexHtml.inpId().value = "";
        IndexHtml.inpTitle().value = "";
        IndexHtml.inpTags().value = "";
        IndexHtml.inpBody().value = "";
        IndexHtml.inpCreated().value = "";
        IndexHtml.inpUpdated().value = "";
        IndexHtml.inpLikes().value = "";
        IndexHtml.switchButtonsToCreateMode(true);
    }

    public resetArticleList(articles: Article[]) {
        let articleList = IndexHtml.articleList();
        removeAllChildren(articleList);
        articles.forEach((article) => {
            articleList.prepend(this.createArticleNode(article));
        });
        this.fillTagsSummary(articles);
    }

    public fillTagsSummary(articles: Article[]) {
        let allTagsCounted = this.countEachTag(articles);
        let sortedTags = Array.from(allTagsCounted.keys()).sort() as string[];

        let tagsSummaryNode = document.getElementById("tagsSummary")!;
        removeAllChildren(tagsSummaryNode);

        let listNode = document.createElement("ul");

        sortedTags.forEach(tagName => {
            let aNode = document.createElement("a");
            aNode.innerText = "#" + tagName + "(" + allTagsCounted.get(tagName) + ")";
            aNode.href = "#";
            aNode.onclick = () => {
                this.onArticleTagClicked(tagName);
            };
            let itemNode = document.createElement("li");
            itemNode.appendChild(aNode);
            listNode.appendChild(itemNode);
        });
        tagsSummaryNode.appendChild(listNode);
    }

    public addArticle(article: Article) {
        IndexHtml.articleList().prepend(this.createArticleNode(article))
    }

    public deleteArticle(id: string) {
        let child = UiHandler.findArticleChildNodeById(id);
        IndexHtml.articleList().removeChild(child);
    }

    public updateArticleNode(article: Article) {
        let child = UiHandler.findArticleChildNodeById(article.id);
        let articleTitleLink = child.getElementsByClassName(UiHandler.CLASS_TITLE)[0]!.firstChild! as HTMLAnchorElement;
        articleTitleLink.innerHTML = article.title;
        articleTitleLink.onclick = () => {
            this.eventBus.dispatch(new EditArticleEvent(article));
        };
        this.resetTags(child.getElementsByClassName(UiHandler.CLASS_TAGS)[0]!, article.tags);
        child.getElementsByClassName(UiHandler.CLASS_BODY)[0]!.innerHTML = article.body;
    }


    // PRIVATE
    // ------------========================================================------------
    // TODO outsource
    private countEachTag(articles: Article[]): Map<string, number> {
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
        return allTagsCounted;
    }

    private initCrudButtonListener() {
        IndexHtml.onClick(IndexHtml.btnCreate(), () => {
            this.eventBus.dispatch(new CreateEvent());
        });
        IndexHtml.onClick(IndexHtml.btnUpdate(), () => {
            this.eventBus.dispatch(new UpdateEvent());
        });
        IndexHtml.onClick(IndexHtml.btnCancel(), () => {
            this.eventBus.dispatch(new CancelEditArticleEvent());
        });
        IndexHtml.onClick(IndexHtml.btnDelete(), () => {
            this.eventBus.dispatch(new DeleteEvent());
        });
    }

    private createArticleNode(article: Article) {
        let articleTitle = document.createElement("h1");
        articleTitle.classList.add(UiHandler.CLASS_TITLE);
        let articleTitleLink = document.createElement("a");
        articleTitleLink.innerText = article.title;
        articleTitleLink.href = "#";
        articleTitleLink.onclick = () => {
            this.eventBus.dispatch(new EditArticleEvent(article));
        };
        articleTitle.appendChild(articleTitleLink);

        let articleTags = document.createElement("p");
        articleTags.classList.add(UiHandler.CLASS_TAGS);
        this.resetTags(articleTags, article.tags);

        let articleBody = document.createElement("pre");
        articleBody.classList.add(UiHandler.CLASS_BODY);
        articleBody.innerText = article.body;

        let articleNode = document.createElement("div");
        articleNode.setAttribute(UiHandler.ATTR_ARTIFACT_ID, article.id);
        articleNode.classList.add("articleNode");
        articleNode.appendChild(articleTitle);
        articleNode.appendChild(articleTags);
        articleNode.appendChild(articleBody);
        return articleNode;
    }

    private resetTags(html: Element, tags: string[]) {
        removeAllChildren(html);
        tags.forEach((tag) => {
            let tagNode = document.createElement("a");
            tagNode.classList.add("clickableTag");
            tagNode.innerText = "#" + tag;
            tagNode.href = "#";
            tagNode.onclick = () => {
                this.onArticleTagClicked(tag);
            };
            html.appendChild(tagNode);
        });
    }

    private static findArticleChildNodeById(articleId: string): HTMLElement {
        return findChildByAttribute(IndexHtml.articleList(), UiHandler.ATTR_ARTIFACT_ID, articleId);
    }
}
