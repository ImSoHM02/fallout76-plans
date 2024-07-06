import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const ApparelList = ({ session }) => {
  const [apparel, setApparel] = useState([]);
  const [completedApparel, setCompletedApparel] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const fetchApparel = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('apparel')
        .select('*')
        .order('outfit_name');

      if (error) throw error;
      setApparel(data);
    } catch (error) {
      setError('Failed to fetch apparel items. Please try refreshing the page.');
    }
  }, []);

  const fetchCompletedApparel = useCallback(async () => {
    if (session) {
      try {
        const { data, error } = await supabase
          .from('completed_apparel')
          .select('a_id');

        if (error) throw error;

        const completedApparelIds = data.reduce((acc, item) => {
          acc[item.a_id] = true;
          return acc;
        }, {});
        setCompletedApparel(completedApparelIds);
      } catch (error) {
        setError('Failed to fetch completed apparel. Please try refreshing the page.');
      }
    } else {
      const savedCompletedApparel = localStorage.getItem('completedApparel');
      if (savedCompletedApparel) {
        setCompletedApparel(JSON.parse(savedCompletedApparel));
      }
    }
  }, [session]);

  useEffect(() => {
    fetchApparel();
    fetchCompletedApparel();
  }, [fetchApparel, fetchCompletedApparel]);

  const handleCheckboxChange = async (apparelId) => {
    const newValue = !completedApparel[apparelId];
    const newCompletedApparel = {
      ...completedApparel,
      [apparelId]: newValue
    };
    setCompletedApparel(newCompletedApparel);

    if (session) {
      if (newValue) {
        await supabase
          .from('completed_apparel')
          .insert({ user_id: session.user.id, a_id: apparelId });
      } else {
        await supabase
          .from('completed_apparel')
          .delete()
          .match({ user_id: session.user.id, a_id: apparelId });
      }
    } else {
      localStorage.setItem('completedApparel', JSON.stringify(newCompletedApparel));
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleHideCompletedChange = (event) => {
    setHideCompleted(event.target.checked);
  };

  const handleDownload = () => {
    const completedApparelIds = Object.keys(completedApparel).filter(id => completedApparel[id]);
    const dataStr = JSON.stringify(completedApparelIds);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'completed_apparel.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const uploadedApparelIds = JSON.parse(e.target.result);
          console.log(`Total apparel to upload: ${uploadedApparelIds.length}`);
          const newCompletedApparel = {...completedApparel};
          
          if (session) {
            const batchSize = 1000;
            let totalUploaded = 0;
            
            for (let i = 0; i < uploadedApparelIds.length; i += batchSize) {
              const batch = uploadedApparelIds.slice(i, Math.min(i + batchSize, uploadedApparelIds.length));
              console.log(`Processing batch: ${i / batchSize + 1}, Size: ${batch.length}`);
              const { data, error } = await supabase
                .from('completed_apparel')
                .upsert(
                  batch.map(apparelId => ({ user_id: session.user.id, a_id: apparelId })),
                  { onConflict: ['user_id', 'a_id'], ignoreDuplicates: true }
                )
                .select();
              
              if (error) {
                console.error('Error in batch upload:', error);
                throw error;
              } else {
                totalUploaded += data.length;
                console.log(`Batch uploaded. Total uploaded so far: ${totalUploaded}`);
                
                batch.forEach(apparelId => {
                  newCompletedApparel[apparelId] = true;
                });
              }
              
              const progress = Math.round((i + batch.length) / uploadedApparelIds.length * 100);
              setUploadProgress(progress);
            }
    
            console.log(`Upload complete. Total apparel uploaded: ${totalUploaded}`);
          } else {
            uploadedApparelIds.forEach(id => {
              newCompletedApparel[id] = true;
            });
            localStorage.setItem('completedApparel', JSON.stringify(newCompletedApparel));
          }
    
          setTimeout(() => {
            setCompletedApparel(newCompletedApparel);
            setIsUploading(false);
            setUploadProgress(0);
            alert('Upload complete. All apparel have been added.');
          }, 1000);
    
          await fetchCompletedApparel();
        } catch (error) {
          console.error('Error during upload:', error);
          alert('An error occurred during the upload. Please check the console for details.');
          setIsUploading(false);
          setUploadProgress(0);
        }
      };
      reader.readAsText(file);
    }
  };

  const filteredApparel = useMemo(() => {
    return apparel.filter(item =>
      (!hideCompleted || !completedApparel[item.a_id]) &&
      item.outfit_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [apparel, hideCompleted, completedApparel, searchTerm]);

  const totalApparel = apparel.length;
  const completedApparelCount = Object.values(completedApparel).filter(Boolean).length;

  return (
    <div className="plan-list">
      <div className={`content-wrapper ${isUploading ? 'blurred' : ''}`}>
        <div className="button-container">
          <button onClick={handleDownload} className="custom-button" disabled={isUploading}>Download Progress</button>
          <label className="custom-file-upload">
            <input type="file" onChange={handleUpload} accept=".json" disabled={isUploading} />
            Upload Progress
          </label>
          {isUploading && <span className="loading-indicator">Uploading... Please don't refresh the page.</span>}
        </div>
        <div className="infobox">
          <div className="info-container">
            <div className="plans-section">
              <span className="plans-label">Apparel Progress: </span>
              <span className="plans-numbers">
                {completedApparelCount} / {totalApparel}
              </span>
              <span className="plans-label"> apparel items collected</span>
            </div>
          </div>
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search apparel..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="hide-completed-container">
          <label className="hide-completed-label">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={handleHideCompletedChange}
              className="hide-completed-checkbox"
            />
            Hide Collected
          </label>
        </div>
        {error && <div className="error-message">{error}</div>}
        
        <div className="apparel-list-container">
          {filteredApparel.length > 0 ? (
            filteredApparel.map((item) => (
              <div key={item.a_id} className="plan-container-style-apparel">
                <label>
                  <input
                    type="checkbox"
                    className="plan-checkbox-style"
                    checked={completedApparel[item.a_id] || false}
                    onChange={() => handleCheckboxChange(item.a_id)}
                  />
                  <span className="plan-name-style">
                    {item.outfit_name}
                  </span>
                </label>
              </div>
            ))
          ) : (
            <div>No apparel items found. {searchTerm ? 'Try adjusting your search.' : ''}</div>
          )}
        </div>
      </div>
      {isUploading && (
        <div className="upload-overlay">
          <div className="upload-message">
            <h3>Uploading Progress</h3>
            <p>Please don't refresh the page. This may take a few moments.</p>
            <progress value={uploadProgress} max="100"></progress>
            <p>{uploadProgress}% Complete</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApparelList;