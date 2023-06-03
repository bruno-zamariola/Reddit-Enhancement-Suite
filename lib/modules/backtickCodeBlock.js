import { markdown } from 'snudown-js';
import { Module } from "../core/module";
import { ajax } from '../environment';
import { regexes, watchForThings } from "../utils";

export const module = new Module("myModule");

module.moduleName = "backtickCodeBlock";
module.category = "browsingCategory";
module.description = "Triple backtick Code Block Support";
module.include = ["comments"];
module.beforeLoad = () => { watchForThings(["post", "comment", "message"], rewriteCodeBlocks); };


async function rewriteCodeBlocks(thing) {
  const markdownBody = thing.element.querySelector('.md');

  // Skipping if there's no code in the comment
  if (!/```|<code>/.test(markdownBody.innerHTML)) {
    return
  }
  
  // Getting the source text (Copied from ./sourceSnudown.js)
  const path = thing.element.getAttribute("data-permalink");
  const response = await ajax({
    url: `${path}.json`,
    query: { raw_json: 1 },
    type: 'json',
  });
  let sourceText;
  if (regexes.commentPermalink.test(path)) {
    sourceText = response[1].data.children[0].data.body;
  } else if (regexes.comments.test(path)) {
    sourceText = response[0].data.children[0].data.selftext;
  } else {
    const postId = ((/\/(\w*)\/?$/).exec(path))[1];
    const data = response.data.children[0].data;
    if (data.id === postId) {
      sourceText = data.body;
    } else {
      sourceText = data.replies.data.children.find(({ data: { id } }) => id === postId).data.body;
    }
  }

  // Parsing source text
  const reflowedMarkdown = sourceText
    .replace(/```(.+?)```/gm, "`$1`")
    .replace(
      /```(?:.*\n([\s\S]+?))```/gm,
      (_, code) => {
        const codeBlock = code.replace(/^/gm, "    ")// split("\n").map(line => "    " + line).join("\n");
        return "\n#\n" + codeBlock + "\n"
      },
    );
  const htmlMarkdown = markdown(reflowedMarkdown);
  markdownBody.innerHTML = htmlMarkdown;
}
