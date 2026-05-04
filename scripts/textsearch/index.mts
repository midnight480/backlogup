import { config } from "dotenv";
import { writeFile } from "fs/promises";
import { tokenize } from "kuromojin";
import { dirname, resolve } from "path";
import { remark } from "remark";
import strip from "strip-markdown";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dist = resolve(__dirname, "../backlog", "dist", "assets");
const distConfigs = resolve(dist, "configs");
const distIssuePages = resolve(dist, "pages");
const distIssues = resolve(dist, "issues");

config({
  override: true,
});

const remarkCache = remark().use(strip);
const stripMarkdown = async (str: string) => (await remarkCache.process(str)).value as string;

const documents = [];

const { start, end } = await import(resolve(distConfigs, "pages.json"));
for (let i = start; i <= end; i++) {
  console.log("search index:", i + 1, "/", end + 1);

  const { default: page } = await import(resolve(distIssuePages, `${i}.json`));
  for (const id of page.map((p) => p.id)) {
    const { default: issue } = await import(resolve(distIssues, `${id}`, "issue.json"));
    const { default: comments } = await import(resolve(distIssues, `${id}`, "comments.json"));

    const target = [issue.summary, issue.description, ...comments.map((c) => c.content)].join("\n\n");
    const plain = await stripMarkdown(target);
    const words = await tokenize(plain);

    const targetPos = ["名詞", "動詞", "形容詞"];
    const ingoreConjugatedForm = ["基本形", "連用形", "仮定形"];
    const ignoreChars = /[!"#$%&'()*+\-.,/:;<=>?@[\\\]^_`{|}~]/g;
    const ignoreNumbers = /^\d+$/;
    const targetWords = Array.from(
      new Set(
        words
          .filter((word) => {
            if (targetPos.includes(word.pos)) {
              if (word.pos === "動詞") {
                return !ingoreConjugatedForm.includes(word.conjugated_form);
              }
              return true;
            }
            return false;
          })
          .map((word) => word.surface_form)
          .filter((form) => !ignoreChars.test(form))
          .filter((form) => !ignoreNumbers.test(form))
          .filter((form) => form.length > 2),
      ),
    );

    documents.push({
      id,
      keywords: targetWords.join(" "),
    });
  }
}

await writeFile(resolve(distConfigs, "search-index.json"), JSON.stringify(documents));
