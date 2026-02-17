import Login from "../../pages/authentication/Login";
import Signup from "../../pages/authentication/Signup";


export const AuthRoute=[
    {
        url: "login",
        page: <Login />,
        name: "Login",
        isPublic: true,
      },
    {
        url: "signup",
        page: <Signup />,
        name: "Signup",
        isPublic: true,
      },
]