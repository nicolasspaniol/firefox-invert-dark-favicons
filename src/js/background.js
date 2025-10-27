// NOTE: Most uses of "favicon" in this file refer to the image's URL

const cache = {}     // Map of original favicon -> processed favicon
const threshold = .1 // Minimum brightness for favicons

// Called when content.js loads or detects a favicon update
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
        if (msg.type !== "faviconUpdate") return

        const originalFavicon = msg.url ?? sender.tab.favIconUrl

        // Shouldn't happen!
        if (!originalFavicon) {
            console.error(`No favicon found for ${sender.tab.url}`)
        }
        // This favicon is the value for some URL in the cache; we can ignore it
        else if (originalFavicon in Object.values(cache)) {
            console.info(`Skipping ${sender.tab.url}`)
        }
        else if (originalFavicon in cache) {
            console.info(`Used cached favicon for ${sender.tab.url}`)
            sendResponse({ url: cache[originalFavicon] })
        }
        else {
            const processedFavicon = await processFavicon(originalFavicon)
            cache[originalFavicon] = processedFavicon

            const wasInverted = processedFavicon !== originalFavicon

            if (wasInverted)
                console.info(`Inverted favicon for ${sender.tab.url}`)
            else
                console.info(`Didn't change favicon for ${sender.tab.url}`)
            
            if (wasInverted) sendResponse({ url: processedFavicon })
        }
    })()

    return true
})

function getImageBrightness(ctx, width, height) {
  const data = ctx.getImageData(0, 0, width, height).data

  let total = 0
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3]
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255 * (a / 255)
    count += a / 255 * (luminance / 2 + .5)
    total += luminance
  }

  return total / count
}

// Checks whether the favicon should have its colors inverted and returns the
// corrected favicon if it needed inversion or the original one otherwise
async function processFavicon(url) {
    // The favicon will be drawn in a canvas with its colors inverted. The
    // brightness of the original image will be calculated based on the inverted
    // one and, if it's less than a threshold, we will return the inverted
    // favicon instead of the original
    return await new Promise((resolve, reject) => {
        const image = new Image()

        image.onload = () => {
            var cnv = document.createElement("canvas")
            cnv.width = image.width
            cnv.height = image.height
            var ctx = cnv.getContext("2d")

            // Draws the image with inverted colors
            ctx.filter = "invert(1)"
            ctx.drawImage(image, 0, 0)

            // As we inverted the image when drawing, the brightness of the
            // original favicon will be the inverse of this one
            brightness = 1 - getImageBrightness(ctx, cnv.width, cnv.height)

            if (brightness < threshold) {
                resolve(cnv.toDataURL()) // Returns the inverted favicon
            }

            resolve(url) // Returns the original favicon
        }

        image.src = url
    })
}
