const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const AI_URL = "https://openrouter.ai/api/v1/chat/completions";

const USERNAME = "baenv";
const REPO_NAME = "df-frontend-2023";

const dog = `
  / \\__
 (    @\\___
 /         O
/   (_____/
/_____/   U
`;

const cat = `
  /\\_/\\  
 ( o.o ) 
 > ^ <
`;

function isValidFileName(fileName) {
  const validExtensions = [".js", ".jsx", ".ts", ".tsx", ".css", ".html"];

  const ignoreFiles = ["setupTests", "reportWebVitals", "react-app-env.d"];

  const folder = "assignment-2";

  return (
    fileName.startsWith(folder) &&
    validExtensions.some((extension) => fileName.endsWith(extension)) &&
    !ignoreFiles.some((file) => fileName.includes(file))
  );
}

async function loadFiles() {
  const response = await axios.get(
    `https://api.github.com/repos/${USERNAME}/${REPO_NAME}/git/trees/main?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
      },
    }
  );
  return response.data.tree
    .filter((item) => item.type === "blob")
    .filter((file) => isValidFileName(file.path));
}

async function readFiles(files) {
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const fileUrl = `https://raw.githubusercontent.com/${USERNAME}/${REPO_NAME}/master/${file.path}`;
      const fileContentResponse = await axios.get(fileUrl);
      return { ...file, content: `${fileContentResponse.data}` };
    })
  );

  return fileContents;
}

async function callAI(prompt) {
  const response = await axios.post(
    AI_URL,
    {
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env["OPEN_AI_API_KEY"]}`,
        "HTTP-Referer": "http://localhost:3000",
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

async function reviewCode(content) {
  const prompt = `
  I want you to act as a code review assistant. I will provide you with code snippets, 
  and you will give me feedback and suggestions for improving code quality, readability, 
  and best practices. Your responses should focus on code-related aspects, 
  and you should avoid discussing non-code-related topics. Provide specific examples for each area
  and limit your recommendations to three per category.

  Use the following response format, keeping the section headings as-is, and provide
your feedback. Use bullet points for each response. The provided examples are for
illustration purposes only and should not be repeated.

**Syntax and logical errors (example)**:
- Incorrect indentation on line 12
- Missing closing parenthesis on line 23

**Code refactoring and quality (example)**:
- Replace multiple if-else statements with a switch case for readability
- Extract repetitive code into separate functions

**Performance optimization (example)**:
- Use a more efficient sorting algorithm to reduce time complexity
- Cache results of expensive operations for reuse

**Security vulnerabilities (example)**:
- Sanitize user input to prevent SQL injection attacks
- Use prepared statements for database queries

**Best practices (example)**:
- Add meaningful comments and documentation to explain the code
- Follow consistent naming conventions for variables and functions

Here is my code:

${content}
  `;

  const response = await callAI(prompt);
  return response?.choices?.[0].message?.content;
}

async function main() {
  const files = await loadFiles();

  const fileContents = await readFiles(files);

  let result = `# Code review \n\n`;

  let index = 0;
  for (const file of fileContents) {
    console.log(index % 2 === 0 ? dog : cat);

    const reviewText = await reviewCode(file.content);

    const message = `## ${file.path} \n\n ${reviewText} \n\n\n`;

    result += message;
    index++;
  }

  fs.writeFile(`${USERNAME}-code-review.md`, result, (err) => {
    if (err) {
      console.error("Error saving the file:", err);
    } else {
      console.log("File saved successfully!");
    }
  });
}

main();
