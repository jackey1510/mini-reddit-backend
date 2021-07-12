import { UserInput } from "src/resolvers/UserResolver";

export const validateRegister = (input: UserInput) => {
  if (input.username.includes("@")) {
    [
      {
        field: "username",
        message: "cannot include @",
      },
    ];
  }
  if (input.username.length < 2) {
    return [
      {
        field: "username",
        message: "length must be greater than 2",
      },
    ];
  }
  if (!input.email.includes("@") || input.email.length < 2) {
    return [
      {
        field: "email",
        message: "invalid email",
      },
    ];
  }

  if (input.password.length < 8) {
    return [
      {
        field: "password",
        message: "length must be greater than 8",
      },
    ];
  }
  return [];
};
