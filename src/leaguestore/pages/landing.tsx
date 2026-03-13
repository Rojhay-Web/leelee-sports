import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function LeagueStoreLanding(){
    const TextRing = (text:string, side: number) => {
        const CHARS = text.split('');
        const INNER_ANGLE = 360 / (CHARS.length + 1);

        const radius = side / Math.sin(INNER_ANGLE / (180 / Math.PI)),
            total = (CHARS.length + 1);

        return (
            <div className="text-ring">
                {CHARS.map((char, index) => (
                    <span style={{
                        transform: `translate(-50%, -50%) rotate(calc(360deg / ${total} * ${index})) translateY(calc(${(radius ?? 5)} * -1ch))`
                    }} key={index}>
                        {char}
                    </span>
                ))}

                <span className="separator" style={{
                    transform: `translate(-50%, -50%) rotate(calc(360deg / ${total} * ${total - 1})) translateY(calc(${(radius ?? 5)} * -1ch))`,
                }}>
                        •&nbsp;
                </span>
            </div>
        )
    }

    useEffect(()=>{ },[]);

    return (
        <div className="ls-page ls-landing">
            <section className="title-section">
                <p>Official League Store</p>
                <h1>Simplified registration and high-quality gear for schools, cities, and families.</h1>
            </section>

            <section className="tool-section">
                <Link className="tool-item" to="/leaguestore/leagues">
                    <div className="tool-icon-container">
                        <div className="tool-icon">
                            {TextRing('Lee Lee Kiddz Sports Leagues', 2.5)}
                            <span className="icon material-symbols-outlined">sports_handball</span>
                        </div>
                    </div>

                    <div className="tool-text">Sports Leagues</div>
                </Link>

                <Link className="tool-item" to="/leaguestore/apparel">
                    <div className="tool-icon-container">
                        <div className="tool-icon">
                            {TextRing('Custom Jerseys & Apparel', 2.7)}
                            <span className="icon material-symbols-outlined">apparel</span>
                        </div>
                    </div>

                    <div className="tool-text">Apparel Store</div>
                </Link>

                <Link className="tool-item" to="/leaguestore/quotes">
                    <div className="tool-icon-container">
                        <div className="tool-icon">
                            {TextRing('League & Apparel Quotes', 2.7)}
                            <span className="icon material-symbols-outlined">library_books</span>
                        </div>
                    </div>

                    <div className="tool-text">Manage Quotes</div>
                </Link>
            </section>
        </div>
    );
}
