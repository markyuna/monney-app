// services/transactions.ts

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
  
  type CreateTransactionParams = {
    userId: string;
    title: string;
    type: TransactionType;
    amount: number;
    category?: string;
    note?: string;
    transactionDate?: string;
  };
  
  export async function createTransaction({
    userId,
    title,
    type,
    amount,
    category = "",
    note = "",
    transactionDate = new Date().toISOString(),
  }: CreateTransactionParams) {
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
        transaction_date: transactionDate,
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
        Query.limit(500),
      ]
    );
  
    return response.documents as unknown as Transaction[];
  }
  
  export async function deleteTransaction(transactionId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.transactionsCollectionId,
      transactionId
    );
  }