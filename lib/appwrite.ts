import "react-native-url-polyfill/auto";
import {
  Account,
  Client,
  Databases,
  ID,
  Query,
  Permission,
  Role,
} from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://fra.cloud.appwrite.io/v1",
  projectId: "69f581530001e1205ba1",
  databaseId: "monneyapp",
  transactionsCollectionId: "collection",
};

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query, Permission, Role };