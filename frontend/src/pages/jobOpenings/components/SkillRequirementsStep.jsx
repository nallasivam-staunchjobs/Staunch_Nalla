

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useDispatch, useSelector } from 'react-redux';
import { 
  updateFormData, 
  addSkill, 
  removeSkill, 
  addLanguage, 
  removeLanguage 
} from '../../../Redux/jobPostingSlice';

const SkillRequirementsStep = () => {
  const dispatch = useDispatch();
  const { formData } = useSelector(state => state.jobPosting);
  const [skillInput, setSkillInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');

  const handleChange = (field, value) => {
    dispatch(updateFormData({ [field]: value }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      dispatch(addSkill(skillInput.trim()));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill) => {
    dispatch(removeSkill(skill));
  };

  const handleAddLanguage = () => {
    if (languageInput.trim()) {
      dispatch(addLanguage(languageInput.trim()));
      setLanguageInput('');
    }
  };

  const handleRemoveLanguage = (language) => {
    dispatch(removeLanguage(language));
  };

  const handleSkillKeyDown = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleLanguageKeyDown = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      handleAddLanguage();
    }
  };

  const Tag = ({ text, onRemove, colorClass }) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
      {text}
      <button
        type="button"
        onClick={onRemove}
        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-opacity-20 hover:bg-white"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-gray-800 mb-6">Job Details</h3>
        <p className="text-gray-600 mb-8">Provide all the necessary information about the job position.</p>
      </div>

      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-800 mb-4">Requirements</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required Skills *
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              onBlur={handleAddSkill}
              placeholder="e.g. React, Node.js, Python"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {formData.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, index) => (
                <Tag
                  key={index}
                  text={skill}
                  onRemove={() => handleRemoveSkill(skill)}
                  colorClass="bg-blue-100 text-blue-800"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Languages Required *
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              onKeyDown={handleLanguageKeyDown}
              onBlur={handleAddLanguage}
              placeholder="e.g. English, Hindi, Tamil"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddLanguage}
              className="px-4 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {formData.languages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.languages.map((language, index) => (
                <Tag
                  key={index}
                  text={language}
                  onRemove={() => handleRemoveLanguage(language)}
                  colorClass="bg-green-100 text-green-800"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Short Description *
          </label>
          <textarea
            value={formData.shortDescription || ''}
            onChange={(e) => handleChange('shortDescription', e.target.value)}
            placeholder="A brief summary of the job position (2-3 lines)"
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Job Description *
          </label>
          <div data-color-mode="light" className="border border-gray-300 rounded-md p-2">
            <MDEditor
              value={formData.jobDescription || ''}
              onChange={(value) => handleChange('jobDescription', value)}
              height={200}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillRequirementsStep;