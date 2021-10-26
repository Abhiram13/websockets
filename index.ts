import { Application } from "express";
import e from "express";
import bodyparser from "body-parser";
import { MongoClient } from "mongodb";
import http from "http";
import ws from "ws";
import { config } from './config';

interface IClient {
   userid: string,
   socket: ws,
}

// interface IChat {
//    [key: string]: IClient[],
// }

interface IChat {
   id: string,
   users: IClient[],
}

export const app: Application = e();
const port = process.env.PORT || 1998;
const seconds = 1000;
const server: http.Server = app.listen(port, StartServer);
const webSocket: ws.Server = new ws.Server({ noServer: true });
const CHATS: IChat = {
   id: "",
   users: [],
};

let clients = [];

export class MONGO {
   private static URI: string = `mongodb+srv://${config.user}:${config.pwd}@cluster0.aowix.mongodb.net/${config.db}?retryWrites=true&w=majority`;
   static client: MongoClient = new MongoClient(MONGO.URI);
   static async Connect(): Promise<void> {
      try {
         await MONGO.client.connect();
         MONGO.client.db("Models");
      } catch (e: any) {
         console.error(e);
      }
   }
}

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.get("/", (req, res) => res.send("hello world").end());

function includes(clients: IClient[], candid: string): { index: number, bool: boolean; } {
   if (clients) {
      for (var i = 0; i < clients.length; i++) {
         if (clients[i].userid === candid) {
            return { bool: true, index: i };
         }
      }
   }

   return { bool: false, index: 0 };
}

app.get("/soc/:chatid/:cand", (req, res) => {
   webSocket.handleUpgrade(req, req.socket, Buffer.alloc(0), (client) => {
      const candid = req.params.cand;
      const chatid = req.params.chatid;
      const inc = includes(CHATS.users, candid);
      CHATS.id = chatid;

      if (CHATS.users.length === 0 || inc.bool === false) {
         CHATS.users.push({
            userid: candid,
            socket: client,
         });
      } else {
         CHATS.users[inc.index].socket = client;
      }

      const clients: IClient[] = CHATS.users;

      client.on("message", function(data) {
         for (let i = 0; i < clients.length; i++) {
            if (clients[i].userid !== candid) {
               clients[i].socket.send(`${candid} is typing`);
            }
         }
      });
   });
});

function StartServer(): void {
   MONGO.Connect();
   console.log(`TypeScript started on port ${port}!`);
}

server.timeout = 5 * seconds;