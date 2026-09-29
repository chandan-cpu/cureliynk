import { useState } from 'react';
import "./components/Laboratory.css";
import {
  HeartPulse,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  FlaskConical,
  MapPin,
  ExternalLink,
  Loader2,
} from 'lucide-react';

import LanguageSelector from './components/LanguageSelector';
import LocationButton from './components/LocationButton';
import QueryForm from './components/QueryForm';
import DoctorResults from './components/DoctorResults';

import { submitMedicalQuery } from './services/medicalApi';


const ui = {
  en: {
    title: 'Find the right specialist',

    subtitle:
      "Describe your health concern and we'll help identify the appropriate medical specialty and nearby specialists.",

    privacy:
      'Your location is only sent with your medical query.',

    error:
      'Something went wrong. Please try again.',

    reset:
      'New search',

    laboratories:
      'Laboratories',

    laboratorySubtitle:
      'Find diagnostic laboratories near your current location.',

    findLaboratories:
      'Find nearby laboratories',

    findingLaboratories:
      'Finding laboratories near you...',

    nearbyLaboratories:
      'Nearby Laboratories',

    laboratoriesFound:
      'laboratories found near you',

    viewMap:
      'View on Map',

    back:
      'Back',

    noLaboratories:
      'No laboratories found near your location.',

    allowLocation:
      'Please allow location access to find nearby laboratories.',

    locationError:
      'Unable to determine your current location.',
  },

  hi: {
    title: 'सही विशेषज्ञ खोजें',

    subtitle:
      'अपनी स्वास्थ्य समस्या बताएं और हम उपयुक्त चिकित्सा विशेषज्ञता तथा आपके पास उपलब्ध विशेषज्ञों की पहचान करने में मदद करेंगे।',

    privacy:
      'आपका स्थान केवल आपकी चिकित्सा क्वेरी के साथ भेजा जाता है।',

    error:
      'कुछ गलत हो गया। कृपया फिर से प्रयास करें।',

    reset:
      'नई खोज',

    laboratories:
      'प्रयोगशालाएँ',

    laboratorySubtitle:
      'अपने वर्तमान स्थान के पास डायग्नोस्टिक प्रयोगशालाएँ खोजें।',

    findLaboratories:
      'पास की प्रयोगशालाएँ खोजें',

    findingLaboratories:
      'आपके पास प्रयोगशालाएँ खोजी जा रही हैं...',

    nearbyLaboratories:
      'पास की प्रयोगशालाएँ',

    laboratoriesFound:
      'प्रयोगशालाएँ आपके पास मिलीं',

    viewMap:
      'मानचित्र पर देखें',

    back:
      'वापस',

    noLaboratories:
      'आपके स्थान के पास कोई प्रयोगशाला नहीं मिली।',

    allowLocation:
      'पास की प्रयोगशालाएँ खोजने के लिए स्थान की अनुमति दें।',

    locationError:
      'आपका वर्तमान स्थान निर्धारित नहीं किया जा सका।',
  },

  as: {
    title: 'সঠিক বিশেষজ্ঞ বিচাৰি উলিয়াওক',

    subtitle:
      'আপোনাৰ স্বাস্থ্যজনিত সমস্যাৰ বিষয়ে কওক আৰু আমি উপযুক্ত চিকিৎসা বিশেষজ্ঞতা আৰু ওচৰৰ বিশেষজ্ঞ বিচাৰি উলিয়াবলৈ সহায় কৰিম।',

    privacy:
      'আপোনাৰ অৱস্থান কেৱল আপোনাৰ চিকিৎসা প্ৰশ্নৰ সৈতে পঠিওৱা হয়।',

    error:
      'কিবা এটা ভুল হৈছে। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',

    reset:
      'নতুন অনুসন্ধান',

    laboratories:
      'পৰীক্ষাগাৰ',

    laboratorySubtitle:
      'আপোনাৰ বৰ্তমান অৱস্থানৰ ওচৰত ডায়েগনষ্টিক পৰীক্ষাগাৰ বিচাৰক।',

    findLaboratories:
      'ওচৰৰ পৰীক্ষাগাৰ বিচাৰক',

    findingLaboratories:
      'আপোনাৰ ওচৰৰ পৰীক্ষাগাৰ বিচাৰি থকা হৈছে...',

    nearbyLaboratories:
      'ওচৰৰ পৰীক্ষাগাৰ',

    laboratoriesFound:
      'টা পৰীক্ষাগাৰ আপোনাৰ ওচৰত পোৱা গৈছে',

    viewMap:
      'মানচিত্ৰত চাওক',

    back:
      'পিছলৈ',

    noLaboratories:
      'আপোনাৰ অৱস্থানৰ ওচৰত কোনো পৰীক্ষাগাৰ পোৱা নগ’ল।',

    allowLocation:
      'ওচৰৰ পৰীক্ষাগাৰ বিচাৰিবলৈ অৱস্থানৰ অনুমতি দিয়ক।',

    locationError:
      'আপোনাৰ বৰ্তমান অৱস্থান নিৰ্ধাৰণ কৰিব পৰা নগ’ল।',
  },
};


const LABORATORY_API_URL =
  'http://127.0.0.1:8000/api/v1/medical/laboratories/nearby';


export default function App() {

  const [language, setLanguage] = useState('en');

  const [query, setQuery] = useState('');

  const [location, setLocation] = useState(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState('');

  const [laboratories, setLaboratories] =
    useState([]);

  const [laboratoryLoading, setLaboratoryLoading] =
    useState(false);

  const [laboratoryError, setLaboratoryError] =
    useState('');

  const [showLaboratories, setShowLaboratories] =
    useState(false);


  const text = ui[language];


  function getLocation() {

    setLocationError('');

    if (!navigator.geolocation) {

      setLocationError(
        'Geolocation is not supported by this browser.'
      );

      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (p) => {

        setLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });

        setLocationLoading(false);
      },

      (e) => {

        setLocationLoading(false);

        setLocationError(
          e.code === 1
            ? 'Location permission was denied. Please allow location access and try again.'
            : e.code === 2
              ? 'Your location could not be determined. Please try again.'
              : 'Location detection timed out. Please try again.'
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  }


  async function submit(e) {

    e.preventDefault();

    setError('');

    if (!query.trim()) {

      setError(
        'Please enter your health concern.'
      );

      return;
    }

    if (!location) {

      setError(
        'Please allow your current location before searching.'
      );

      return;
    }

    setLoading(true);

    try {

      setResult(
        await submitMedicalQuery({
          query: query.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
          language,
        })
      );

    } catch (err) {

      setError(
        err.message || text.error
      );

    } finally {

      setLoading(false);
    }
  }


  async function findLaboratories() {

    setLaboratoryError('');

    setLaboratoryLoading(true);

    setShowLaboratories(true);


    function searchWithLocation(latitude, longitude) {

      return fetch(
        `${LABORATORY_API_URL}?latitude=${latitude}&longitude=${longitude}&radius_km=10&limit=10`
      );
    }


    if (!location) {

      if (!navigator.geolocation) {

        setLaboratoryError(
          text.allowLocation
        );

        setLaboratoryLoading(false);

        return;
      }


      navigator.geolocation.getCurrentPosition(

        async (position) => {

          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setLocation(newLocation);


          try {

            const response =
              await searchWithLocation(
                newLocation.latitude,
                newLocation.longitude
              );


            if (!response.ok) {

              throw new Error(
                'Unable to find nearby laboratories.'
              );
            }


            const data =
              await response.json();


            setLaboratories(
              data.laboratories || []
            );

          } catch (err) {

            console.error(
              'Laboratory API error:',
              err
            );

            setLaboratoryError(
              err.message || text.error
            );

          } finally {

            setLaboratoryLoading(false);
          }
        },

        (err) => {

          console.error(
            'Laboratory location error:',
            err
          );

          setLaboratoryError(
            err.code === 1
              ? text.allowLocation
              : text.locationError
          );

          setLaboratoryLoading(false);
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000,
        }
      );

      return;
    }


    try {

      const response =
        await searchWithLocation(
          location.latitude,
          location.longitude
        );


      if (!response.ok) {

        throw new Error(
          'Unable to find nearby laboratories.'
        );
      }


      const data =
        await response.json();


      setLaboratories(
        data.laboratories || []
      );

    } catch (err) {

      console.error(
        'Laboratory API error:',
        err
      );

      setLaboratoryError(
        err.message || text.error
      );

    } finally {

      setLaboratoryLoading(false);
    }
  }


  function reset() {

    setQuery('');

    setResult(null);

    setError('');

    setShowLaboratories(false);

    setLaboratories([]);

    setLaboratoryError('');
  }


  function closeLaboratories() {

    setShowLaboratories(false);

    setLaboratories([]);

    setLaboratoryError('');
  }


  return (

    <div className="app-shell">

      {/* HEADER */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark">
            <HeartPulse size={23} />
          </div>

          <div>

            <strong>
              MediAssist
            </strong>

            <span>
              AI Medical Assistant
            </span>

          </div>

        </div>


        <div className="header-actions">

          <div className="secure-label">

            <ShieldCheck size={16} />

            Secure

          </div>


          <LanguageSelector
            value={language}
            onChange={(v) => {
              setLanguage(v);
              setError('');
            }}
          />

        </div>

      </header>


      <main className="main-content">


        {/* LABORATORIES PAGE */}

        {showLaboratories ? (

          <div className="results-page">

            <div className="results-topbar">

              <div>

                <p className="eyebrow">
                  Nearby services
                </p>

                <h1>
                  {text.nearbyLaboratories}
                </h1>

              </div>


              <button
                className="secondary-button"
                onClick={closeLaboratories}
              >

                <RotateCcw size={17} />

                {text.back}

              </button>

            </div>


            {laboratoryLoading ? (

              <div className="laboratory-loading">

                <Loader2
                  size={32}
                  className="laboratory-spinner"
                />

                <h3>
                  {text.findingLaboratories}
                </h3>

                <p>
                  Using your current location
                </p>

              </div>

            ) : laboratoryError ? (

              <div className="laboratory-error">

                <MapPin size={30} />

                <p>
                  {laboratoryError}
                </p>

                <button
                  className="primary-button"
                  onClick={findLaboratories}
                >
                  {text.findLaboratories}
                </button>

              </div>

            ) : laboratories.length === 0 ? (

              <div className="laboratory-empty">

                <FlaskConical size={32} />

                <h3>
                  {text.noLaboratories}
                </h3>

                <button
                  className="primary-button"
                  onClick={findLaboratories}
                >
                  {text.findLaboratories}
                </button>

              </div>

            ) : (

              <>

                <div className="laboratory-count">

                  <FlaskConical size={18} />

                  <span>
                    {laboratories.length}{' '}
                    {text.laboratoriesFound}
                  </span>

                </div>


                <div className="laboratory-list">

                  {laboratories.map(
                    (lab, index) => (

                      <div
                        className="laboratory-card"
                        key={
                          lab.place_id || index
                        }
                      >

                        <div className="laboratory-icon">

                          <FlaskConical
                            size={23}
                          />

                        </div>


                        <div className="laboratory-card-content">

                          <h3>
                            {lab.name ||
                              'Medical Laboratory'}
                          </h3>


                          <p className="laboratory-type">

                            Diagnostic Laboratory

                          </p>


                          <p className="laboratory-address">

                            {lab.address ||
                              'Address unavailable'}

                          </p>


                          <div className="laboratory-actions">

                            {lab.google_maps_url && (

                              <a
                                href={
                                  lab.google_maps_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="laboratory-map-button"
                              >

                                {text.viewMap}

                                <ExternalLink
                                  size={15}
                                />

                              </a>

                            )}

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </>

            )}

          </div>


        ) : !result ? (


          /* MAIN SEARCH PAGE */

          <section className="hero">

            <div className="hero-badge">

              <Sparkles size={16} />

              Intelligent specialist discovery

            </div>


            <h1>
              {text.title}
            </h1>


            <p className="hero-subtitle">
              {text.subtitle}
            </p>


            <div className="search-card">

              <LocationButton
                location={location}
                loading={locationLoading}
                error={locationError}
                onGetLocation={getLocation}
              />


              <div className="divider" />


              <QueryForm
                query={query}
                onQueryChange={setQuery}
                onSubmit={submit}
                loading={loading}
                disabled={!location}
              />


              {error && (

                <div className="api-error">
                  {error}
                </div>

              )}

            </div>


            {/* LABORATORY BUTTON */}

            <div className="laboratory-entry">

              <button
                className="laboratory-entry-button"
                onClick={findLaboratories}
              >

                <div className="laboratory-entry-icon">

                  <FlaskConical size={22} />

                </div>


                <div className="laboratory-entry-text">

                  <strong>
                    {text.laboratories}
                  </strong>

                  <span>
                    {text.laboratorySubtitle}
                  </span>

                </div>


                <span className="laboratory-entry-arrow">
                  →
                </span>

              </button>

            </div>


            <div className="privacy-note">

              <ShieldCheck size={17} />

              <span>
                {text.privacy}
              </span>

            </div>

          </section>


        ) : (


          /* SPECIALIST RESULTS */

          <div className="results-page">

            <div className="results-topbar">

              <div>

                <p className="eyebrow">
                  Your search
                </p>

                <h1>
                  Specialist results
                </h1>

              </div>


              <button
                className="secondary-button"
                onClick={reset}
              >

                <RotateCcw size={17} />

                {text.reset}

              </button>

            </div>


            <div className="submitted-query">

              <span>
                Your query
              </span>

              <p>
                {result.query || query}
              </p>

            </div>


            <DoctorResults
              result={result}
            />


            {error && (

              <div className="api-error">
                {error}
              </div>

            )}

          </div>

        )}

      </main>


      <footer className="footer">

        <span>
          AI Medical Assistant
        </span>

        <span>
          For informational purposes only. Seek professional medical care when needed.
        </span>

      </footer>

    </div>
  );
}