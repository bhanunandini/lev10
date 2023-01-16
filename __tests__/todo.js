/* eslint-disable no-undef */
const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function fetchCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let response = await agent.get("/login");
  let csrfToken = fetchCsrfToken(response);
  response = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("todo test suits", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(process.env.PORT || 4000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("Test Sign Up", async () => {
    let response = await agent.get("/signup");
    const csrfToken = fetchCsrfToken(response);
    response = await agent.post("/users").send({
      firstName: "Suraj",
      lastName: "chy",
      email: "suraj123@gmail.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Test Sign Out", async () => {
    let response = await agent.get("/todos");
    expect(response.statusCode).toBe(200);
    response = await agent.get("/signout");
    expect(response.statusCode).toBe(302);
    response = await agent.get("/todos");
    expect(response.statusCode).toBe(302);
  });

  test('Second user signup', async () => {
    let res = await agent.get("/signup");
    const csrfToken = fetchCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "sovit",
      lastName: "chy",
      email: "sovit123@gmail.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Test create a new todo", async () => {
    const agent = request.agent(server);
    await login(agent, "suraj123@gmail.com", "12345678");
    const getResponse = await agent.get("/todos");
    const csrfToken = fetchCsrfToken(getResponse);
    const response = await agent.post("/todos").send({
      title: "Go to Market",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });
  test("Test a markAsComplete functionality", async () => {
    const agent = request.agent(server);
    await login(agent, "suraj123@gmail.com", "12345678");
    const getResponse = await agent.get("/todos");
    let csrfToken = fetchCsrfToken(getResponse);
    await agent.post("/todos").send({
      title: "Buy Fruits",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const TodosItems = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const TodosItemsParse = JSON.parse(TodosItems.text);
    const calculateTodosTodayITem = TodosItemsParse.dueToday.length;
    const Todo = TodosItemsParse.dueToday[calculateTodosTodayITem - 1];
    const boolStatus = Todo.completed ? false : true;
    anotherRes = await agent.get("/todos");
    csrfToken = fetchCsrfToken(anotherRes);

    const changeTodo = await agent
      .put(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: boolStatus });

    const UpadteTodoItemParse = JSON.parse(changeTodo.text);
    expect(UpadteTodoItemParse.completed).toBe(true);
  });
  test("Test the delete functionality", async () => {
    const agent = request.agent(server);
    await login(agent, "suraj123@gmail.com", "12345678");
    const getResponse = await agent.get("/todos");
    let csrfToken = fetchCsrfToken(getResponse);
    await agent.post("/todos").send({
      title: "Go to home",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const TodosItems = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const TodosItemsParse = JSON.parse(TodosItems.text);
    const calculateTodosTodayITem = TodosItemsParse.dueToday.length;
    const Todo = TodosItemsParse.dueToday[calculateTodosTodayITem - 1];
    const boolStatus = Todo.completed ? false : true;
    anotherRes = await agent.get("/todos");
    csrfToken = fetchCsrfToken(anotherRes);

    const changeTodo = await agent
      .delete(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: boolStatus });

    const boolResponse = Boolean(changeTodo.text);
    expect(boolResponse).toBe(true);
  });

  test("Test marking an item as incomplete", async () => {
    const agent = request.agent(server);
    await login(agent, "suraj123@gmail.com", "12345678");
    const getResponse = await agent.get("/todos");
    let csrfToken = fetchCsrfToken(getResponse);
    await agent.post("/todos").send({
      title: "Go to shop",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const TodosItems = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const TodosItemsParse = JSON.parse(TodosItems.text);
    const calculateTodosTodayITem = TodosItemsParse.dueToday.length;
    const Todo = TodosItemsParse.dueToday[calculateTodosTodayITem - 1];
    const boolStatus = !Todo.completed;
    let anotherRes = await agent.get("/todos");
    csrfToken = fetchCsrfToken(anotherRes);

    const changeTodo = await agent
      .put(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: boolStatus });

    const UpadteTodoItemParse = JSON.parse(changeTodo.text);
    expect(UpadteTodoItemParse.completed).toBe(true);

    anotherRes = await agent.get("/todos");
    csrfToken = fetchCsrfToken(anotherRes);

    const changeTodo2nd = await agent
      .put(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: !boolStatus });

    const UpadteTodoItemParse2 = JSON.parse(changeTodo2nd.text);
    expect(UpadteTodoItemParse2.completed).toBe(false);
  });

  test("test delete one user todo by another user", async () => {
    const firstAgent = request.agent(server);
    await login(firstAgent, "suraj123@gmail.com", "12345678");
    let res = await firstAgent.get("/todos");
    let csrfToken = fetchCsrfToken(res);
    await firstAgent.post("/todos").send({
      title: "first user todo",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await firstAgent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const firstUserLatestTodo =
      parsedGroupedResponse.dueToday[dueTodayCount - 1];

    const secondUser = request.agent(server);
    await login(secondUser, "sovit123@gmail.com", "12345678");

    res = await secondUser.get("/todos");
    csrfToken = fetchCsrfToken(res);
    const deletedResponse = await secondUser
      .delete(`/todos/${firstUserLatestTodo.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedDeletedResponse = JSON.parse(deletedResponse.text);
    expect(parsedDeletedResponse).toBe(true);
  });
});
