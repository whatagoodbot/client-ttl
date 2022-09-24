const SpotifyWebApi = require('spotify-web-api-node')

class SpotifyClient {
  constructor (clientId, clientSecret) {
    this.api = new SpotifyWebApi({ clientId, clientSecret })
    this.refreshAccessToken = undefined
    this.setAccessToken()
  }

  tearDown () {
    clearTimeout(this.refreshAccessToken)
  }

  setAccessToken () {
    this.api
      .clientCredentialsGrant()
      .then((data) => {
        if (this.refreshAccessToken) {
          clearTimeout(this.refreshAccessToken)
          this.refreshAccessToken = undefined
        }

        const expiresIn = data.body.expires_in
        const accessToken = data.body.access_token

        // Save the access token so that it's used in future calls
        this.api.setAccessToken(accessToken)

        /* Refresh when it expires. May want to call on 401 as well */
        this.refreshAccessToken = setTimeout(
          this.setAccessToken.bind(this),
          expiresIn * 1000
        )
      })
      .catch((err) => {
        console.log('Unable to refresh Spotify access token')
        console.error(err)
      })
  }

  getPlaylist (id) {
    return this.api
      .getPlaylist(id)
      .then(({ body }) => {
        const {
          tracks: { items },
          name
        } = body

        if (items.length === 0) {
          throw new Error('Playlist does not contain any tracks.')
        }

        const results = { name, items }
        return results
      })
      .catch((err) => {
        if (err.statusCode === 401) {
          this.setAccessToken()
        } else {
          console.error('getPlaylist', id, err)
          throw err
        }
      })
  }

  getTrack (id) {
    return this.api
      .getTrack(id)
      .then(({ body }) => body)
      .catch((err) => {
        if (err.statusCode === 401) {
          this.setAccessToken()
        } else {
          console.error('getTrack', id, err)
        }
        return err.body
      })
  }

  getArtist (id) {
    return this.api
      .getArtist(id)
      .then(({ body }) => body)
      .catch((err) => {
        if (err.statusCode === 401) {
          this.setAccessToken()
        } else {
          console.error('getArtist', id, err)
        }
        return err.body
      })
  }

  getAudioFeatures (id) {
    return this.api
      .getAudioFeaturesForTrack(id)
      .then(({ body }) => body)
      .catch((err) => {
        if (err.statusCode === 401) {
          this.setAccessToken()
        } else {
          console.error('getAudioFeatures', id, err)
        }
        return err.body
      })
  }

  getRecommendations (params) {
    // const params = {
    //   min_energy: 0.4,
    //   seed_artists: seedArtists,
    //   min_popularity: 50,
    // };
    return this.api.getRecommendations(params).then(
      (data) => {
        const recommendations = data.body
        return recommendations
      },
      (err) => {
        console.log('Something went wrong!', err)
        return null
      }
    )
  }

  getRecommendationGenres () {
    return this.api.getAvailableGenreSeeds().then(
      (data) => {
        const genreSeeds = data.body
        return genreSeeds
      },
      (err) => {
        console.log('Something went wrong!', err)
        return null
      }
    )
  }
}

module.exports = { SpotifyClient }
