import {
    appwriteConfig,
    databases,
    ID,
    Query,
    Permission,
    Role,
  } from "@/lib/appwrite";
  
  export type TransactionType = "income" | "expense";
  
  export type Transaction = {
    $id: string;
    user_id: string;
    title: string;
    type: TransactionType;
    amount: number;
    category?: string;
    note?: string;
    transaction_date: string;
  };
  
  export async function createTransaction({
    userId,
    title,
    type,
    amount,
    category = "",
    note = "",
  }: {
    userId: string;
    title: string;
    type: TransactionType;
    amount: number;
    category?: string;
    note?: string;
  }) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.transactionsCollectionId,
      ID.unique(),
      {
        user_id: userId,
        title,
        type,
        amount,
        category,
        note,
        transaction_date: new Date().toISOString(),
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ]
    );
  }
  
  export async function getUserTransactions(userId: string) {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.transactionsCollectionId,
      [
        Query.equal("user_id", userId),
        Query.orderDesc("transaction_date"),
      ]
    );
  
    return response.documents as unknown as Transaction[];
  }