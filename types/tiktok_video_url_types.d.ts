// Nested types
interface IDiscoveryInput {
    search_keyword?: string | null;
}

interface IMusic {
    authorname?: string | null;
    covermedium?: string | null; // type: url
    id?: string | null;
    original?: boolean | null;
    playurl?: string | null; // type: url
    title?: string | null;
}

interface ITaggedUser {
    user_id?: string | null;
    user_handle?: string | null;
    user_url?: string | null; // type: url
    user_name?: string | null;
}

interface ISubtitleInfo {
    url_expire?: string | null;
    size?: number | null;
    language_id?: string | null;
    language_code_name?: string | null;
    url?: string | null; // type: url
    format?: string | null;
    version?: string | null;
    source?: string | null;
}

export type TiktokVideo_gd_lu702nij2f790tmv9h = {
    url: string; // type: url, required
    post_id?: string;
    description?: string;
    create_time?: string; // ISO 8601 timestamp
    digg_count?: number;
    share_count?: string | null;
    collect_count?: number;
    comment_count?: number;
    play_count?: number;
    video_duration?: number;
    hashtags?: string[] | null;
    original_sound?: string | null;
    profile_id?: string;
    profile_username?: string | null;
    profile_url?: string; // type: url
    profile_avatar?: string; // type: url
    profile_biography?: string | null;
    preview_image?: string; // type: url
    post_type?: "video" | "content" | string;
    discovery_input?: IDiscoveryInput | null;
    offical_item?: boolean;
    secu_id?: string;
    original_item?: boolean;
    shortcode?: string;
    width?: number;
    ratio?: string;
    video_url?: string | null; // type: url, session-based only
    music?: IMusic | null;
    cdn_url?: string | null; // type: url
    is_verified?: boolean | null;
    account_id?: string | null;
    carousel_images?: string[] | null; // type: url[]
    tagged_user?: ITaggedUser[] | null;
    profile_followers?: number | null;
    tt_chain_token?: string | null;
    region?: string | null;
    commerce_info?: string | null;
    subtitle_url?: string | null; // type: url
    subtitle_format?: string | null;
    country?: string | null;
    subtitle_info?: ISubtitleInfo[] | null;
    cdn_link?: string | null;
    num_share_count?: number | null;
};
