import { useEffect, useRef, useState } from "react";

// Images: Cover
import homeCover1 from "../../assets/landing/cover1.jpg";
import homeCoverFront1 from "../../assets/landing/cover1_clean2.png";

import homeCover2 from "../../assets/landing/cover2.jpg";
import homeCoverFront2 from "../../assets/landing/cover2_clean.png";

import homeCover3 from "../../assets/landing/cover3.jpg";
import homeCoverFront3 from "../../assets/landing/cover3_clean.png";

import homeCover4 from "../../assets/landing/cover4.jpg";
import homeCoverFront4 from "../../assets/landing/cover4_clean.png";

import homeCover5 from "../../assets/landing/cover5.jpg";
import homeCoverFront5 from "../../assets/landing/cover5_clean.png";

type HomeCoverType = {
    title: string;
    backImage: string;
    frontImage: string;
}

const introVideoId = 'FgB79gj4S60';
const homeCover: HomeCoverType[] = [
    { title: 'Lee Lee Kiddz', backImage: homeCover1, frontImage: homeCoverFront1 },
    { title: 'Community', backImage: homeCover2, frontImage: homeCoverFront2 },
    { title: 'Engagement', backImage: homeCover3, frontImage: homeCoverFront3 },
    { title: 'Consistency', backImage: homeCover4, frontImage: homeCoverFront4 },
    { title: 'Teamwork', backImage: homeCover5, frontImage: homeCoverFront5 }
];

function Home(){
    const [cover, setCover] = useState<HomeCoverType>(homeCover[0]);
    const [coverVideo, setCoverVideo] = useState(false);

    const welcomeContainerRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = (event: any) => {
        if ((welcomeContainerRef.current && !welcomeContainerRef.current.contains(event.target))) {
            setCoverVideo(false);
        }
    };

    useEffect(() => {
        const min = 0, max = homeCover.length - 1;
        const rndInt = Math.floor(Math.random() * (max - min + 1)) + min;
        setCover(homeCover[rndInt]);

        // Add event listener to detect clicks outside the welcome container
        document.addEventListener("click", handleClickOutside, false);

        return () => {
            document.removeEventListener("click", handleClickOutside, false);
        };
    }, []);

    return (
        <div className="core-page home">
            <section className="landing-section">             
                <div className="home-cover-container">
                    <img src={cover.backImage} alt={`${cover.title} cover`} className="back-cover slow-blink"/>
                    <div className="back-cover-cover" />
                    <div className="cover-title slow-blink">{cover.title}</div>
                    <img src={cover.frontImage} alt={`${cover.title} cover front`} className="front-cover slow-blink"/>
                </div> 

                <div className={`welcome-container ${coverVideo ? 'video-playing' : ''}`} ref={welcomeContainerRef}>
                    <div className='video-container' onClick={()=> setCoverVideo(true)}>
                        <span className="icon material-symbols-outlined">play_circle</span>
                        <img src={`https://img.youtube.com/vi/${introVideoId}/hqdefault.jpg`} alt='intro video thumbnail' className="intro-video-thumbnail"/>
                    </div>
                    <div className="content-container">
                        <div className="text-container">
                            <p>
                                You don't have to do everything
                                <br /><span className="level2">You just have to do</span>
                                <br /><span className="level3">Your Part</span>
                            </p>
                        </div>
                    </div>
                </div>
            </section> 
        </div>
    );
}

export default Home;