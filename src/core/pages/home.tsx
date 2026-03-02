import { useEffect, useRef, useState } from "react";
import { gql, useQuery, useLazyQuery } from '@apollo/client';
import { ripples } from 'ldrs';
import Slider from "react-slick";

import { API_URL, parseRichText } from "../../utils";
import { formatDateV2, VIDEOS_URL } from "../../utils/_customUtils";

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

// Image: Logos
import youtube_icon from '../../assets/logo/youtube.png';

// Types
import { SiteVideo } from "../../datatypes";
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
const slider_settings = {
    infinite: true,
    slidesToShow: 3.5,
    slidesToScroll: 1,
    autoplay: true,
    speed: 20000,
    autoplaySpeed: 0,
    cssEase: "linear",
    responsive: [
        {
            breakpoint: 770,
            settings: {
                slidesToShow: 1.5,
                infinite: false,
                autoplay: false,
            }
        }
    ]
};

const PAGE_KEY = 'home';
const GET_PAGE_QUERY = gql`
query GetHomePage($key: String!, $page:Int, $pageSize:Int) { 
    sitePage(key: $key) {
        pageKeys {
            _id
            title
            type
            metaData
            value
        }
    }
    videos(page:$page, pageSize:$pageSize){
        totalResults
        results {
            id
            title
            description
            publishedAt
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
    const [selectedSport, setSelectedSport] = useState<HomeSportsType>();
    const [moreLeagueImages] = useState<string[]>([leagueImg1, leagueImg2, leagueImg3, leagueImg4, leagueImg5, leagueImg6]);

    const welcomeContainerRef = useRef<HTMLDivElement>(null);
    
    const { loading, data } = useQuery(GET_PAGE_QUERY, {variables: { key: PAGE_KEY, page: 1, pageSize: 10 }, fetchPolicy: 'cache-and-network' });
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
            setSelectedSport(sportsList[0]);
        }
    },[sportsList]);

    useEffect(() => {
        if(selectedSport){
            retrieveSportPhotos({ variables: { id: selectedSport?._id, page: 1, pageSize: 6 }});
        }
    },[selectedSport]);

    useEffect(() => {
        // Load Ring Loader Animation
        ripples.register();

        // Randomly Set COver Photo
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

            <section className="our-sports-section">
                <div className="sports-list-container">
                    <div className="sports-list-inner-container">
                        {!loading && sportsList.map((sport: HomeSportsType, key: number) => 
                            <div className={`sport-item ${selectedSport?._id === sport._id ? 'selected' : ''}`} key={key} onClick={() => setSelectedSport(sport)}>
                                <span className="sport-logo material-symbols-outlined">{sport?.logo ?? 'trophy'}</span>
                                <span className="sport-title">{sport.title}</span>
                            </div>
                        )}

                        {loading && [0,0,0].map((_empty:any, key: number) =>
                            <div className='sport-item empty' key={key} />
                        )}

                        <div className={`sport-item ${!selectedSport ? 'selected' : ''}`} onClick={() => setSelectedSport(undefined)}>
                            <span className="sport-logo material-symbols-outlined">steppers</span>
                            <span className="sport-title">More Leagues</span>
                        </div>
                    </div>
                </div>

                <div className="sports-info-container">
                    <div className="image-container">
                        {!loading && !sp_loading ?
                            <>
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
                            </> :
                            <div className="league-image empty"><l-ripples size="150" speed="1.5" color="rgba(200,175,175,1)" /></div>
                        }
                    </div>

                    <div className="sport-details-container">{parseRichText(selectedSport?.description ?? '')}</div>
                    <div className="sport-btn-container">
                        <a href="" className="site-btn c2">
                            <span className="icon material-symbols-outlined">tour</span>
                            <span className="title">League Information</span>
                        </a>
                    </div>
                </div>
            </section>

            <section className="our-videos">
                <h1 className="lrgTitle ctr c0" data-text="Videos">League Videos</h1>

                <div className="site-btn-container end">
                    <a href={VIDEOS_URL} target='_blank' className="site-btn clean mini">
                        <span className="icon material-symbols-outlined">youtube_activity</span>
                        <span className="title">More Videos</span>
                    </a>
                </div>

                <div className="video-container">
                    {loading ?
                        <>Loading...</> :
                        <>
                            {!(data?.videos?.results?.length > 0) ?
                                <h2>More Videos TO Come</h2> :
                                <Slider {...slider_settings}>
                                    {data.videos.results.map((item: SiteVideo, i:number) =>
                                        <a className='video-item-container' key={i} href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noreferrer">
                                            <div className='img-cover'>
                                                <img className='icon' src={youtube_icon} alt="Youtube link icon" />
                                                <img className='thumbnail' src={`https://img.youtube.com/vi/${item.id}/mqdefault.jpg`} alt="YouTube Video Thumbnail"></img>
                                            </div>
                                            <div className='slider-content'>
                                                <span className='title'>{item.title}</span>
                                                <span className='date'>{formatDateV2(item.publishedAt, 'MMM d, yyyy')}</span>
                                            </div>
                                        </a>
                                    )}
                                </Slider>
                            }
                        </>
                    }
                </div>                
            </section>

            <section className="our-partners"></section>
        </div>
    );
}

export default Home;