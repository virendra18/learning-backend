import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message:"John Banega Don"
    // })

    // get user details from frontend
    // validation- not empty
    // check if user already exist: username, email
    // check for image, check for avatar
    // upload them to cloudinary, avatar
    // create user object- create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // console.log("This is req.body---> ",req.body);

    //1. Yaha hamne req.body se extract kiye saare data points
    const { fullName, email, username, password } = req.body
    console.log("email: ", email);

   
    //2.  Check kar rahe saare data points ko . Agar koi bhi field empty hua to error dedo 
    if
        (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")

    }

    // 3. Check kiya ki already user exist to nahi karta same username ya email se
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    // Agar same username ya email ka user exist karta hai to throw error 
    if (existedUser) {
        throw new ApiError(409, "User with email or username exists")
    }

    // console.log("req.files()--> " ,req.files);

    // Local path nikala avatar ka for uploading it to cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path


    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    // coverImage dena temporary hai so isiliye if se check karo ki user ne diya hai ki nahi 
    let coverImageLocalPath;
    if(req.files&& Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    // avatarLocalPath dena compulsory hai so agar user ne nahi diya to throw error
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // Cloudinary pe upload kardo
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // Agar avatar upload nahi hua to error dedo
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // Sab kuch ho gaya hai successfully to object create kar do 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //Password aur refreshToken hata do
    // select ke andar likhte hai kya nahi chahiye with _sign
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // Agar user create nahi hua to error dedo
    if (!createdUser) {
        throw new ApiError(500, "SOmething went wrong while registering the user")
    }

    // User register ho gaya hai
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})


export { registerUser }