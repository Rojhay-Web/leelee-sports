import { useEffect, useRef, useState } from "react";
import { gql, useQuery, useLazyQuery } from '@apollo/client';

import { API_URL, handleGQLError } from "../../utils";

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

// Images: Sports
import leagueImg1 from "../../assets/home/image1.jpg";
import leagueImg2 from "../../assets/home/image2.jpg";
import leagueImg3 from "../../assets/home/image3.jpg";
import leagueImg4 from "../../assets/home/image4.jpg";
import leagueImg5 from "../../assets/home/image5.jpg";
import leagueImg6 from "../../assets/home/image6.jpg";

type HomeCoverType = {
    title: string;
    backImage: string;
    frontImage: string;
}

type HomeSportsType = {
    _id: string;
    title: string;
    description: string;
    logo: string;
}

const introVideoId = 'FgB79gj4S60';
const homeCover: HomeCoverType[] = [
    { title: 'Lee Lee Kiddz', backImage: homeCover1, frontImage: homeCoverFront1 },
    { title: 'Community', backImage: homeCover2, frontImage: homeCoverFront2 },
    { title: 'Engagement', backImage: homeCover3, frontImage: homeCoverFront3 },
    { title: 'Consistency', backImage: homeCover4, frontImage: homeCoverFront4 },
    { title: 'Teamwork', backImage: homeCover5, frontImage: homeCoverFront5 }
];

const PAGE_KEY = 'home';
const GET_PAGE_QUERY = gql`
query GetSitePage($key: String!) { 
    sitePage(key: $key) {
        pageKeys {
            _id
            title
            type
            metaData
            value
        }
    }
}`,
GET_PHOTOSET_IMAGES_QUERY = gql`
query getPhotosetImages($id:String!, $page: Int, $pageSize:Int){
    photosetImages(id: $id, page:$page, pageSize:$pageSize){
        pagesLeft
        results {
            _id
        }
    }
}`;

function Home(){
    const [cover, setCover] = useState<HomeCoverType>(homeCover[0]);
    const [coverVideo, setCoverVideo] = useState(false);

    const [sportsList, setSportsList] = useState<HomeSportsType[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>();
    const [moreLeagueImages] = useState<string[]>([leagueImg1, leagueImg2, leagueImg3, leagueImg4, leagueImg5, leagueImg6]);

    const welcomeContainerRef = useRef<HTMLDivElement>(null);

    const { loading, error, data } = useQuery(GET_PAGE_QUERY, {variables: { key: PAGE_KEY }, fetchPolicy: 'cache-and-network' });
    const [retrieveSportPhotos, { loading: sp_loading,  data: sp_data }] = useLazyQuery(GET_PHOTOSET_IMAGES_QUERY, {fetchPolicy: 'cache-and-network' });

    const handleClickOutside = (event: any) => {
        if ((welcomeContainerRef.current && !welcomeContainerRef.current.contains(event.target))) {
            setCoverVideo(false);
        }
    };

    useEffect(()=> {
        if(!loading && data?.sitePage?.pageKeys){
            data.sitePage.pageKeys.forEach((pageKey: any) => {
                switch(pageKey.title.toLowerCase()) {
                    case "sports-list":
                        setSportsList(pageKey?.value?.data || []);
                        break;
                    case "sponsors":
                        break;
                    default:
                        break;
                }
            });
        }
    },[loading, data]);

    useEffect(() => {
        if(sportsList.length > 0){
            setSelectedSport(sportsList[0]._id);
        }
    },[sportsList]);

    useEffect(() => {
        if(selectedSport){
            retrieveSportPhotos({ variables: { id: selectedSport, page: 1, pageSize: 6 }});
        }
    },[selectedSport]);

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

    if(error) { console.log(error.message); }

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

            <section className="our-sports-section">
                <div className="sports-list-container">
                    <div className="sports-list-inner-container">
                        {sportsList.map((sport: HomeSportsType, key: number) => 
                            <div className={`sport-item ${selectedSport === sport._id ? 'selected' : ''}`} key={key} onClick={() => setSelectedSport(sport._id)}>
                                <span className="sport-logo material-symbols-outlined">{sport?.logo ?? 'trophy'}</span>
                                <span className="sport-title">{sport.title}</span>
                            </div>
                        )}

                        <div className={`sport-item ${!selectedSport ? 'selected' : ''}`} onClick={() => setSelectedSport(undefined)}>
                            <span className="sport-logo material-symbols-outlined">steppers</span>
                            <span className="sport-title">More Leagues</span>
                        </div>
                    </div>
                </div>

                <div className="sports-info-container">
                    <div className="image-container">
                        {(!selectedSport) ?
                            <>
                                {moreLeagueImages.map((img, key) => 
                                    <div className="league-image" key={key}><img src={img} alt={`league ${key}`} /></div>
                                )}
                            </> :
                            <>
                                {sp_data?.photosetImages?.results.map((img:any, key:number) => 
                                    <div className="league-image" key={key}>
                                        <img src={`${API_URL}/kaleidoscope/${img._id}`} alt={`league ${key}`} />
                                    </div>
                                )}
                            </>
                        }
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;