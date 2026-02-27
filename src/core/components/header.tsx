import LoginBtn from "./loginBtn";

function Header(){
    return (
        <>
            <nav className="navbar navbar-expand-lg">
                <div className="nav-section end">
                    <LoginBtn />
                </div>
            </nav>
        </>
    );
}

export default Header;