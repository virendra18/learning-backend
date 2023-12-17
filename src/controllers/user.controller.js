import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken = async (userId) => {
    try {

        // user ko find kar raha userId ke basis pe
        const user = await User.findById(userId)

        // accessToken and refreshToken generate kar raha hai
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //refreshToken ko database mai save kar diya 
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generation refresh and access token")

    }
}


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
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
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
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})



const loginUser = asyncHandler(async (req, res) => {
    // req.body->data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookies

    // req.body se data info le lo
    const { email, username, password } = req.body

    // Agar username ya email nahi hai to error dedo

    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required")
    }

    // user nikal lo kisi bhi ek ke basis pe ya to username ya password
    //findOne() return kar deta hai jaise hi uske phla entry milta hai MongoDB mai
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    //Agar user exist nahi karta hai to throw error
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // password check kar lo
    const isPasswordValid = await user.isPasswordCorrect(password)

    // agar password valid nahi hai to throw error
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    //select mai wo sab field likhte hai "-" lagake jo nahi chahiye
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
        {
            user:loggedInUser,accessToken,refreshToken

        },
        "User logged in successfully"
        )
    )
})


const logoutUser=asyncHandler(async(req,res)=>{
    // findByIdAndUpdate bolta hai query batato find kaise karna hai phir update karna kya hai
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out successfully"))

})

export {
    registerUser,
    loginUser,
    logoutUser
}
