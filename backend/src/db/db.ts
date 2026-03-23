import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import "dotenv/config";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter })



async function insertUser(
    email: string,
    firstName: string,
    password: string,
) {
    const res = await prisma.user.create({
        data: {
            email: email,
            password: password,
            firstName: firstName
        }
    })

    console.log("User Created Successfully: "+res);
}

async function showAllUsers() {
    const users = await prisma.user.findMany();
    console.log(users);
}

//insertUser("abcd@example.com", "Alphabet's Brother", "number's sister");
// showAllUsers();