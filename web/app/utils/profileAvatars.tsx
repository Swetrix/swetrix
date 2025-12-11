import Avatar from 'boring-avatars'

// Adjectives and nouns for generating anonymous display names
const ADJECTIVES = [
  'Amber',
  'Azure',
  'Beige',
  'Black',
  'Blue',
  'Bronze',
  'Brown',
  'Coral',
  'Crimson',
  'Cyan',
  'Emerald',
  'Fuchsia',
  'Gold',
  'Gray',
  'Green',
  'Indigo',
  'Ivory',
  'Jade',
  'Lavender',
  'Lime',
  'Magenta',
  'Maroon',
  'Mint',
  'Navy',
  'Olive',
  'Orange',
  'Peach',
  'Pink',
  'Plum',
  'Purple',
  'Red',
  'Rose',
  'Ruby',
  'Salmon',
  'Sapphire',
  'Scarlet',
  'Silver',
  'Slate',
  'Teal',
  'Turquoise',
  'Violet',
  'White',
  'Yellow',
]

const NOUNS = [
  'Albatross',
  'Ant',
  'Badger',
  'Bear',
  'Beaver',
  'Bison',
  'Butterfly',
  'Camel',
  'Cardinal',
  'Cat',
  'Cheetah',
  'Cobra',
  'Condor',
  'Coyote',
  'Crane',
  'Crow',
  'Deer',
  'Dolphin',
  'Dove',
  'Dragon',
  'Eagle',
  'Elephant',
  'Elk',
  'Falcon',
  'Ferret',
  'Finch',
  'Flamingo',
  'Fox',
  'Frog',
  'Gazelle',
  'Giraffe',
  'Goat',
  'Goose',
  'Gorilla',
  'Hamster',
  'Hare',
  'Hawk',
  'Hedgehog',
  'Heron',
  'Hippo',
  'Horse',
  'Hummingbird',
  'Hyena',
  'Iguana',
  'Jaguar',
  'Jay',
  'Kangaroo',
  'Koala',
  'Lemur',
  'Leopard',
  'Lion',
  'Llama',
  'Lobster',
  'Lynx',
  'Macaw',
  'Meerkat',
  'Mongoose',
  'Moose',
  'Moth',
  'Mouse',
  'Narwhal',
  'Newt',
  'Octopus',
  'Orca',
  'Ostrich',
  'Otter',
  'Owl',
  'Panda',
  'Panther',
  'Parrot',
  'Peacock',
  'Pelican',
  'Penguin',
  'Phoenix',
  'Pig',
  'Pigeon',
  'Piranha',
  'Pony',
  'Porcupine',
  'Puma',
  'Quail',
  'Rabbit',
  'Raccoon',
  'Raven',
  'Rhino',
  'Robin',
  'Salamander',
  'Salmon',
  'Seal',
  'Shark',
  'Sheep',
  'Sloth',
  'Snail',
  'Snake',
  'Sparrow',
  'Spider',
  'Squirrel',
  'Stork',
  'Swan',
  'Tiger',
  'Toucan',
  'Trout',
  'Turtle',
  'Viper',
  'Vulture',
  'Walrus',
  'Weasel',
  'Whale',
  'Wolf',
  'Wombat',
  'Woodpecker',
  'Yak',
  'Zebra',
]

// Color palette for boring-avatars
const AVATAR_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']

/**
 * Generate a deterministic display name from profileId
 */
const generateDisplayName = (profileId: string): string => {
  let hash = 0
  for (let i = 0; i < profileId.length; i++) {
    const char = profileId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  hash = Math.abs(hash)

  const adjIndex = hash % ADJECTIVES.length
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length

  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`
}

/**
 * Get display name for a profile - handles both identified and anonymous users
 */
export const getProfileDisplayName = (profileId: string, isIdentified: boolean): string => {
  if (isIdentified) {
    const userId = profileId.replace('usr_', '')
    if (userId.length <= 20) {
      return userId
    }
    return `${userId.substring(0, 17)}...`
  }
  return generateDisplayName(profileId)
}

interface ProfileAvatarProps {
  profileId: string
  size?: number
  className?: string
}

/**
 * Avatar component for user profiles using boring-avatars
 */
export const ProfileAvatar = ({ profileId, size = 40, className }: ProfileAvatarProps) => {
  return (
    <div className={className}>
      <Avatar size={size} name={profileId} variant='beam' colors={AVATAR_COLORS} />
    </div>
  )
}
