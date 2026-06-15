// Nested types for comments and replies
interface IReply {
    comments: string;
    user_commenting: string;
    likes: number;
}

interface IComment {
    comments: string;
    user_commenting: string;
    likes: number;
    replies: IReply[] | null;
    profile_picture?: string;
}

interface ITaggedUser {
    full_name: string;
    id: string;
    is_verified: boolean;
    profile_pic_url: string; // type: url
    username: string;
}

interface IDiscoveryInput {
    keyword: string;
    pages: number;
}

interface IPartnershipDetails {
    profile_id?: string | null;
    username?: string | null;
    profile_url?: string | null; // type: url
}

interface IPostContentItem {
    index?: number | null;
    type?: "Photo" | "Video" | string | null;
    url?: string | null; // type: url
    id?: string | null;
    alt_text?: string | null;
}

interface IAudio {
    audio_asset_id?: string | null;
    original_audio_title?: string | null;
    ig_artist_username?: string | null;
    ig_artist_id?: string | null;
}

interface IVideoDuration {
    url?: string | null; 
    video_duration?: number | null;
}

interface IImage {
    url?: string | null;
    id?: string | null; 
}

export type InstagramPost_gd_lk5ns7kz21pck8jpis ={
    url: string; 
    user_posted?: string;
    description?: string; 
    hashtags?: string[] | null; 
    num_comments: number; 
    date_posted: string; 
    likes?: number | null; 
    photos?: string[] | null; 
    videos?: string[] | null; 
    location?: string[] | null; 
    latest_comments?: IComment[] | null; 
    post_id?: string;
    discovery_input?: IDiscoveryInput | null; 
    has_handshake?: boolean | null;
    shortcode?: string;
    content_type?: string; 
    pk?: string; 
    content_id?: string; 
    engagement_score_view?: number; 
    thumbnail?: string; 
    video_view_count?: string; 
    product_type?: string;
    coauthor_producers?: string[] | null; 
    tagged_users?: ITaggedUser[] | null; 
    video_play_count?: number; 
    followers?: number; 
    posts_count?: number;
    profile_image_link?: string | null; 
    is_verified?: boolean; 
    is_paid_partnership?: boolean | null; 
    partnership_details?: IPartnershipDetails | null; 
    user_posted_id?: string | null; 
    post_content?: IPostContentItem[] | null; 
    audio?: IAudio | null; 
    profile_url?: string | null; 
    videos_duration?: IVideoDuration[] | null; 
    images?: IImage[] | null; 
    alt_text?: string | null; 
    photos_number?: number | null; 
    audio_url?: string | null;
    timestamps?: string|null;
}