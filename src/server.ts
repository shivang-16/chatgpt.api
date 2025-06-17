import { app } from "./app";
import ConnectToDB from "./db/db";
import { logger } from "./utils/winstonLogger";


const port = process.env.PORT || 4000

ConnectToDB(); //main db

app.listen(port, () => logger.info(`Server is running on port ${port}`));
